require('../backend/node_modules/dotenv').config();

const mongodb = require('../backend/src/db/mongodb');
const DLQMessage = require('../backend/src/db/models/DLQMessage');

const now = Date.now();

const seedMessages = [
  {
    messageId: 'SEED-12345',
    originalMessage: {
      description: 'Order #5678 processing failed',
      orderId: 'ORD-5678',
      service: 'order-service'
    },
    errorReason: 'Downstream order processor returned 502',
    errorType: 'ORDER_PROCESSING_ERROR',
    retryCount: 3,
    dlqRetryCount: 0,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 6),
    lastFailedAt: new Date(now - 1000 * 60 * 18),
    status: 'dlq_failed',
    nextRetryAt: new Date(now + 1000 * 60 * 5),
    metadata: {
      source: 'dashboard-seed',
      priority: 1,
      tags: ['seed', 'orders']
    }
  },
  {
    messageId: 'SEED-67890',
    originalMessage: {
      description: 'User data update timeout',
      userId: 'USR-2048',
      service: 'profile-service'
    },
    errorReason: 'Profile write timed out after 8 seconds',
    errorType: 'TIMEOUT_ERROR',
    retryCount: 2,
    dlqRetryCount: 1,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 4),
    lastFailedAt: new Date(now - 1000 * 60 * 12),
    status: 'dlq_replayed',
    nextRetryAt: null,
    metadata: {
      source: 'dashboard-seed',
      priority: 2,
      tags: ['seed', 'users']
    },
    replayAttempts: [
      {
        timestamp: new Date(now - 1000 * 60 * 10),
        workerId: 'seed-script',
        strategy: 'manual_replay',
        result: 'replayed',
        notes: 'Seeded replay history'
      }
    ]
  },
  {
    messageId: 'SEED-54321',
    originalMessage: {
      description: 'Payment gateway connection error',
      paymentId: 'PAY-9812',
      service: 'billing-service'
    },
    errorReason: 'Gateway TLS handshake failed',
    errorType: 'PAYMENT_GATEWAY_ERROR',
    retryCount: 1,
    dlqRetryCount: 0,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 3),
    lastFailedAt: new Date(now - 1000 * 60 * 25),
    status: 'dlq_failed',
    nextRetryAt: new Date(now + 1000 * 60 * 15),
    metadata: {
      source: 'dashboard-seed',
      priority: 1,
      tags: ['seed', 'payments']
    }
  },
  {
    messageId: 'SEED-98765',
    originalMessage: {
      description: 'Email notification delivered',
      campaignId: 'CMP-44',
      service: 'notification-service'
    },
    errorReason: 'Initial SMTP handshake failed',
    errorType: 'SMTP_ERROR',
    retryCount: 0,
    dlqRetryCount: 0,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 8),
    lastFailedAt: new Date(now - 1000 * 60 * 60 * 7),
    status: 'dlq_resolved',
    nextRetryAt: null,
    resolvedAt: new Date(now - 1000 * 60 * 60 * 6),
    resolvedBy: 'seed-script',
    resolutionNotes: 'Seeded as resolved example',
    metadata: {
      source: 'dashboard-seed',
      priority: 3,
      tags: ['seed', 'notifications']
    }
  },
  {
    messageId: 'SEED-11223',
    originalMessage: {
      description: 'Inventory sync conflict',
      sku: 'SKU-4455',
      service: 'inventory-service'
    },
    errorReason: 'Version conflict while applying stock update',
    errorType: 'CONFLICT_ERROR',
    retryCount: 4,
    dlqRetryCount: 2,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 10),
    lastFailedAt: new Date(now - 1000 * 60 * 8),
    status: 'dlq_failed',
    nextRetryAt: new Date(now + 1000 * 60 * 20),
    metadata: {
      source: 'dashboard-seed',
      priority: 1,
      tags: ['seed', 'inventory']
    }
  },
  {
    messageId: 'SEED-33445',
    originalMessage: {
      description: 'Log event stream overflow',
      stream: 'audit-log',
      service: 'logging-service'
    },
    errorReason: 'Consumer lag exceeded threshold',
    errorType: 'STREAM_OVERFLOW',
    retryCount: 1,
    dlqRetryCount: 1,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 2),
    lastFailedAt: new Date(now - 1000 * 60 * 6),
    status: 'dlq_processing',
    nextRetryAt: new Date(now + 1000 * 60 * 2),
    metadata: {
      source: 'dashboard-seed',
      priority: 2,
      tags: ['seed', 'logs']
    }
  },
  {
    messageId: 'SEED-77001',
    originalMessage: {
      description: 'Webhook delivery 404 response',
      webhookId: 'WH-109',
      service: 'webhook-service'
    },
    errorReason: 'Target endpoint returned HTTP 404',
    errorType: 'WEBHOOK_NOT_FOUND',
    retryCount: 2,
    dlqRetryCount: 1,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 5),
    lastFailedAt: new Date(now - 1000 * 60 * 4),
    status: 'dlq_failed',
    nextRetryAt: new Date(now + 1000 * 60 * 30),
    metadata: {
      source: 'dashboard-seed',
      priority: 2,
      tags: ['seed', 'webhooks']
    }
  },
  {
    messageId: 'SEED-88112',
    originalMessage: {
      description: 'Auth token refresh completed',
      tenantId: 'TNT-55',
      service: 'auth-service'
    },
    errorReason: 'Token issuer temporarily unavailable',
    errorType: 'AUTH_PROVIDER_ERROR',
    retryCount: 1,
    dlqRetryCount: 1,
    firstFailedAt: new Date(now - 1000 * 60 * 60 * 12),
    lastFailedAt: new Date(now - 1000 * 60 * 60 * 11),
    status: 'dlq_resolved',
    nextRetryAt: null,
    resolvedAt: new Date(now - 1000 * 60 * 60 * 10),
    resolvedBy: 'seed-script',
    resolutionNotes: 'Recovered after token provider came back online',
    metadata: {
      source: 'dashboard-seed',
      priority: 3,
      tags: ['seed', 'auth']
    }
  }
];

async function seed() {
  try {
    await mongodb.connect();

    const operations = seedMessages.map((message) => ({
      updateOne: {
        filter: { messageId: message.messageId },
        update: {
          $set: {
            ...message,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await DLQMessage.bulkWrite(operations, { ordered: false });

    console.log('DLQ seed complete');
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
    console.log(`Upserted: ${result.upsertedCount}`);
  } catch (error) {
    console.error('DLQ seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongodb.disconnect().catch(() => {});
  }
}

seed();
