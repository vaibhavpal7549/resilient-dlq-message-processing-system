require('../backend/node_modules/dotenv').config();

const mongodb = require('../backend/src/db/mongodb');
const queueManager = require('../backend/src/queue/queueManager');
const DLQMessage = require('../backend/src/db/models/DLQMessage');

function usage() {
  console.log('Usage:');
  console.log('  node scripts/dlq-cli.js replay-one <mongoId>');
  console.log('  node scripts/dlq-cli.js replay-failed');
  console.log('  node scripts/dlq-cli.js resolve <mongoId> [resolvedBy] [notes]');
}

function createReplayMessage(dlqMessage, replayTag) {
  return {
    messageId: `cli_replay_${dlqMessage.messageId}_${Date.now()}`,
    payload: dlqMessage.originalMessage,
    source: dlqMessage.metadata?.source || 'dlq-cli',
    priority: dlqMessage.metadata?.priority || 2,
    tags: [...(dlqMessage.metadata?.tags || []), replayTag],
    retryCount: 0,
    originalDLQId: dlqMessage._id.toString()
  };
}

function canReplay(dlqMessage) {
  if (!dlqMessage) {
    return { ok: false, reason: 'DLQ message not found' };
  }

  if (dlqMessage.status === 'dlq_processing') {
    return { ok: false, reason: 'Message is currently being processed' };
  }

  if (dlqMessage.status === 'dlq_replayed') {
    return { ok: false, reason: 'Message has already been replayed' };
  }

  if (dlqMessage.status === 'dlq_resolved') {
    return { ok: false, reason: 'Resolved messages cannot be replayed' };
  }

  const replayedAttempt = (dlqMessage.replayAttempts || []).some((attempt) => attempt.result === 'replayed');
  if (replayedAttempt) {
    return { ok: false, reason: 'Replay attempt already recorded for this message' };
  }

  return { ok: true };
}

async function markAsReplayed(dlqMessage, notes, strategy) {
  dlqMessage.status = 'dlq_replayed';
  await dlqMessage.addReplayAttempt({
    timestamp: new Date(),
    workerId: 'dlq-cli',
    strategy,
    result: 'replayed',
    notes
  });
  await dlqMessage.save();
}

async function replayOne(id) {
  const dlqMessage = await DLQMessage.findById(id);
  const replayCheck = canReplay(dlqMessage);

  if (!replayCheck.ok) {
    throw new Error(replayCheck.reason);
  }

  const replayMessage = createReplayMessage(dlqMessage, 'cli_replay');
  await queueManager.initialize();
  await queueManager.enqueue(replayMessage);
  await markAsReplayed(dlqMessage, 'Replayed via CLI helper', 'cli_replay_one');

  console.log(JSON.stringify({
    success: true,
    action: 'replay-one',
    messageId: dlqMessage.messageId,
    replayMessageId: replayMessage.messageId
  }, null, 2));
}

async function replayFailed() {
  const failedMessages = await DLQMessage.find({ status: 'dlq_failed' }).sort({ createdAt: 1 });

  if (failedMessages.length === 0) {
    console.log(JSON.stringify({
      success: true,
      action: 'replay-failed',
      total: 0,
      replayed: 0,
      skipped: 0
    }, null, 2));
    return;
  }

  await queueManager.initialize();

  let replayed = 0;
  let skipped = 0;
  const details = [];

  for (const dlqMessage of failedMessages) {
    const replayCheck = canReplay(dlqMessage);
    if (!replayCheck.ok) {
      skipped += 1;
      details.push({
        id: dlqMessage._id.toString(),
        messageId: dlqMessage.messageId,
        skipped: true,
        reason: replayCheck.reason
      });
      continue;
    }

    const replayMessage = createReplayMessage(dlqMessage, 'cli_batch_replay');
    await queueManager.enqueue(replayMessage);
    await markAsReplayed(dlqMessage, 'Batch replay via CLI helper', 'cli_replay_failed');

    replayed += 1;
    details.push({
      id: dlqMessage._id.toString(),
      messageId: dlqMessage.messageId,
      replayMessageId: replayMessage.messageId
    });
  }

  console.log(JSON.stringify({
    success: true,
    action: 'replay-failed',
    total: failedMessages.length,
    replayed,
    skipped,
    details
  }, null, 2));
}

async function resolveOne(id, resolvedBy = 'dlq-cli', notes = 'Resolved via CLI helper') {
  const dlqMessage = await DLQMessage.findById(id);

  if (!dlqMessage) {
    throw new Error('DLQ message not found');
  }

  if (dlqMessage.status === 'dlq_resolved') {
    throw new Error('Message is already resolved');
  }

  await dlqMessage.markAsResolved(resolvedBy, notes);

  console.log(JSON.stringify({
    success: true,
    action: 'resolve',
    id,
    messageId: dlqMessage.messageId,
    resolvedBy,
    notes
  }, null, 2));
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command) {
    usage();
    process.exitCode = 1;
    return;
  }

  await mongodb.connect();

  try {
    if (command === 'replay-one') {
      if (!args[0]) {
        throw new Error('Missing MongoDB document ID');
      }
      await replayOne(args[0]);
    } else if (command === 'replay-failed') {
      await replayFailed();
    } else if (command === 'resolve') {
      if (!args[0]) {
        throw new Error('Missing MongoDB document ID');
      }
      await resolveOne(args[0], args[1], args.slice(2).join(' ') || undefined);
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  } finally {
    await queueManager.close().catch(() => null);
    await mongodb.disconnect().catch(() => null);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));
  process.exitCode = 1;
});
