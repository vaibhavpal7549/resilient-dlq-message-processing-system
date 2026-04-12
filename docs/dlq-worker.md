# DLQ Worker Service

## Worker Service Code

The background worker entrypoint is [worker/src/index.js](/d:/dlq/worker/src/index.js:1). It:

- connects to MongoDB
- initializes the worker orchestrator
- polls the DLQ at fixed intervals
- handles graceful shutdown for `SIGINT`, `SIGTERM`, `uncaughtException`, and `unhandledRejection`

The main polling loop lives in [worker/src/services/workerOrchestrator.js](/d:/dlq/worker/src/services/workerOrchestrator.js:1).

## Retry Logic

The worker fetches pending DLQ messages from MongoDB using `DLQMessage.findPendingMessages(...)`, then processes them through:

- [messageProcessor.js](/d:/dlq/worker/src/services/messageProcessor.js:1)
- [failureClassifier.js](/d:/dlq/worker/src/services/failureClassifier.js:1)
- [retryStrategy.js](/d:/dlq/worker/src/services/retryStrategy.js:1)

Behavior:

- temporary errors -> immediate retry with backoff
- permanent errors -> mark as failed
- unknown/manual errors -> flag for manual intervention
- exhausted DLQ retries -> permanently fail the message

## Logging Setup

The worker uses Winston logging in [worker/src/utils/logger.js](/d:/dlq/worker/src/utils/logger.js:1).

It logs to:

- console
- `logs/dlq-worker.log`
- `logs/error.log`

Debugging details include:

- worker ID
- poll iterations
- queue event errors
- error category
- retry strategy
- per-batch failure summaries

## Crash Handling

Crash safety is handled by:

- stale lock cleanup before each poll cycle
- guarded shutdown to prevent duplicate stop sequences
- signal handling for graceful process termination
- exception and rejection handlers that log the error before shutdown
