# Dead Letter Queue Implementation

## DLQ Queue Implementation

The backend now includes a FIFO dead-letter queue abstraction in [dlqQueue.js](/d:/dlq/backend/src/dlq/dlqQueue.js:1).

Behavior:

- simulates Unix-style FIFO queue behavior in memory
- provides non-blocking async `enqueueDLQ` and `dequeueDLQ`
- persists each failed message to MongoDB before it is considered queued
- stores failure metadata, error classification, and timestamps in the `DLQMessage` collection
- falls back to MongoDB lookup when the in-memory FIFO is empty

## Persistence Logic

`enqueueDLQ(payload)`:

- upserts the DLQ record in MongoDB
- pushes `messageId` into the FIFO queue if it is not already queued
- returns the persisted MongoDB document

`dequeueDLQ()`:

- returns the oldest queued message from the in-memory FIFO
- if the FIFO is empty, returns the oldest pending MongoDB DLQ record
- returns `null` if no DLQ message is available

## Example Usage

```js
const { enqueueDLQ, dequeueDLQ } = require('../backend/src/dlq/dlqQueue');

await enqueueDLQ({
  messageId: 'msg_1001',
  originalMessage: { orderId: 'ORD-1001' },
  errorReason: 'External API timeout after 5000ms',
  errorStack: 'Error: timeout ...',
  errorType: 'TRANSIENT_ERROR',
  retryCount: 3,
  dlqRetryCount: 0,
  firstFailedAt: new Date(),
  lastFailedAt: new Date(),
  status: 'dlq_pending',
  nextRetryAt: new Date(Date.now() + 60000),
  metadata: {
    source: 'api',
    priority: 1,
    tags: ['orders'],
    requestHeaders: {},
    policyVersion: 'git-tracked-v2',
    originalQueue: 'message-processing',
    overflowedToUnixSpool: false,
    systemState: {
      cpuUsage: 0.2,
      memoryUsage: 0.5,
      activeConnections: 10,
      queueDepth: 42
    }
  },
  debug: {
    lastErrorName: 'TIMEOUT_ERROR',
    lastErrorCode: 'TIMEOUT_ERROR',
    lastDecision: 'MAX_RETRIES_EXCEEDED'
  }
});

const nextDlqMessage = await dequeueDLQ();
console.log(nextDlqMessage?.messageId);
```
