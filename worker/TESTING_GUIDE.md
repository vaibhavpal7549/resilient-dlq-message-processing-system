# DLQ Worker Testing Guide

Complete guide to test the DLQ worker service from setup to verification.

---

## Prerequisites

Ensure you have:
- ✅ Node.js 18+ installed
- ✅ MongoDB running (locally or remote)
- ✅ Redis running (locally or remote)

---

## Step 1: Environment Setup

### 1.1 Install Dependencies

```bash
cd worker
npm install
```

### 1.2 Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use your preferred editor
```

**Minimum required configuration:**
```bash
MONGODB_URI=mongodb://localhost:27017/dlq_system
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 1.3 Start MongoDB and Redis

**Using Docker:**
```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Start Redis
docker run -d -p 6379:6379 --name redis redis:7.0
```

**Or use existing installations:**
```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Check if Redis is running
redis-cli ping
```

---

## Step 2: Insert Test DLQ Messages

### 2.1 Connect to MongoDB

```bash
mongosh mongodb://localhost:27017/dlq_system
```

### 2.2 Insert Test Messages

**Test Message 1: TEMPORARY Error (Will Retry)**
```javascript
db.dlqmessages.insertOne({
  messageId: 'test_temp_001',
  originalMessage: { 
    userId: 'user123',
    action: 'process_payment',
    amount: 100.50
  },
  errorReason: 'Connection timeout to payment gateway',
  errorStack: 'Error: ETIMEDOUT\n    at TCPConnectWrap.afterConnect',
  errorType: 'TIMEOUT_ERROR',
  retryCount: 3,
  dlqRetryCount: 0,
  firstFailedAt: new Date(),
  lastFailedAt: new Date(),
  status: 'dlq_pending',
  nextRetryAt: new Date(),
  lockedBy: null,
  lockedAt: null,
  metadata: {
    source: 'api',
    priority: 1,
    tags: ['payment', 'test']
  },
  replayAttempts: []
});
```

**Test Message 2: PERMANENT Error (Will Fail)**
```javascript
db.dlqmessages.insertOne({
  messageId: 'test_perm_001',
  originalMessage: { 
    userId: 'user456',
    action: 'create_account',
    email: 'invalid-email'
  },
  errorReason: 'Email validation failed',
  errorStack: 'ValidationError: Invalid email format',
  errorType: 'VALIDATION_ERROR',
  retryCount: 3,
  dlqRetryCount: 0,
  firstFailedAt: new Date(),
  lastFailedAt: new Date(),
  status: 'dlq_pending',
  nextRetryAt: new Date(),
  lockedBy: null,
  lockedAt: null,
  metadata: {
    source: 'api',
    priority: 2,
    tags: ['account', 'test']
  },
  replayAttempts: []
});
```

**Test Message 3: UNKNOWN Error (Manual Intervention)**
```javascript
db.dlqmessages.insertOne({
  messageId: 'test_unknown_001',
  originalMessage: { 
    userId: 'user789',
    action: 'complex_operation',
    data: { foo: 'bar' }
  },
  errorReason: 'Unexpected error occurred',
  errorStack: 'Error: Something went wrong',
  errorType: 'UNKNOWN_ERROR',
  retryCount: 3,
  dlqRetryCount: 0,
  firstFailedAt: new Date(),
  lastFailedAt: new Date(),
  status: 'dlq_pending',
  nextRetryAt: new Date(),
  lockedBy: null,
  lockedAt: null,
  metadata: {
    source: 'api',
    priority: 3,
    tags: ['test']
  },
  replayAttempts: []
});
```

### 2.3 Verify Messages Inserted

```javascript
// Check all test messages
db.dlqmessages.find({ messageId: /^test_/ }).pretty();

// Count pending messages
db.dlqmessages.countDocuments({ status: 'dlq_pending' });
```

---

## Step 3: Start the Worker

### 3.1 Start in Development Mode

```bash
cd worker
npm run dev
```

**Expected startup output:**
```
============================================================
DLQ Worker Service Starting
MongoDB connected
Queue initialized
Starting worker polling loop
============================================================
```

### 3.2 Watch the Logs

The worker will:
1. Poll for pending messages every 30 seconds (default)
2. Process messages in batches
3. Log all operations

**Expected log output:**
```
2026-02-12 14:30:00 info: Found pending DLQ messages { count: 3 }
2026-02-12 14:30:00 info: Processing DLQ message { messageId: 'test_temp_001', errorType: 'TIMEOUT_ERROR' }
2026-02-12 14:30:00 info: Executing immediate retry { strategy: 'IMMEDIATE_RETRY' }
2026-02-12 14:30:00 info: Message processed successfully
```

---

## Step 4: Verify Processing Results

### 4.1 Check Message Status Updates

**In MongoDB shell:**

```javascript
// Check TEMPORARY error message (should be retried)
db.dlqmessages.findOne({ messageId: 'test_temp_001' });
```

**Expected changes:**
- `dlqRetryCount`: 1 (incremented)
- `nextRetryAt`: Future timestamp (1 minute from now)
- `status`: 'dlq_pending'
- `replayAttempts`: Array with 1 entry

```javascript
// Check PERMANENT error message (should be failed)
db.dlqmessages.findOne({ messageId: 'test_perm_001' });
```

**Expected changes:**
- `status`: 'dlq_failed'
- `replayAttempts`: Array with 1 entry

```javascript
// Check UNKNOWN error message (should be manual)
db.dlqmessages.findOne({ messageId: 'test_unknown_001' });
```

**Expected changes:**
- `status`: 'dlq_manual'
- `replayAttempts`: Array with 1 entry

### 4.2 Check Replay Attempts

```javascript
// View replay attempt details
db.dlqmessages.findOne(
  { messageId: 'test_temp_001' },
  { replayAttempts: 1 }
).replayAttempts;
```

**Expected structure:**
```javascript
[{
  timestamp: ISODate("2026-02-12T09:00:00.000Z"),
  workerId: "worker_hostname_12345_1234567890",
  strategy: "IMMEDIATE_RETRY",
  result: "scheduled",
  notes: "Retry attempt 1 scheduled for ..."
}]
```

---

## Step 5: Test Retry Behavior

### 5.1 Wait for Next Retry

The TEMPORARY error message will be retried after 1 minute (first backoff).

**Monitor logs:**
```bash
tail -f logs/dlq-worker.log
```

### 5.2 Simulate Multiple Retries

To test the full retry sequence, manually update the message:

```javascript
// Reset message to trigger immediate retry
db.dlqmessages.updateOne(
  { messageId: 'test_temp_001' },
  { 
    $set: { 
      nextRetryAt: new Date(),
      status: 'dlq_pending'
    }
  }
);
```

Watch the worker process it again with increased backoff.

---

## Step 6: Test Lock Management

### 6.1 Simulate Stale Lock

```javascript
// Create a message with a stale lock
db.dlqmessages.updateOne(
  { messageId: 'test_temp_001' },
  { 
    $set: { 
      lockedBy: 'old_worker_123',
      lockedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      status: 'dlq_processing'
    }
  }
);
```

**Expected behavior:**
- Worker will detect stale lock (older than 5 minutes)
- Clear the lock
- Process the message

**Check logs for:**
```
info: Cleared stale locks { count: 1 }
```

---

## Step 7: Test Graceful Shutdown

### 7.1 Send Shutdown Signal

```bash
# Press Ctrl+C in the terminal running the worker
# Or send SIGTERM
kill -SIGTERM <worker_pid>
```

**Expected shutdown output:**
```
============================================================
DLQ Worker Service Shutting Down { reason: 'SIGINT' }
Worker Statistics {
  totalProcessed: 3,
  totalSuccessful: 3,
  totalFailed: 0,
  successRate: '100.00%'
}
============================================================
```

---

## Step 8: Verify Statistics

### 8.1 Check MongoDB Statistics

```javascript
// Count by status
db.dlqmessages.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
]);
```

**Expected output:**
```javascript
[
  { _id: 'dlq_pending', count: 1 },   // TEMPORARY (waiting for retry)
  { _id: 'dlq_failed', count: 1 },    // PERMANENT
  { _id: 'dlq_manual', count: 1 }     // UNKNOWN
]
```

### 8.2 Check Error Type Distribution

```javascript
db.dlqmessages.aggregate([
  { $group: { _id: '$errorType', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

---

## Step 9: Advanced Testing

### 9.1 Test High Volume

Insert multiple messages:

```javascript
// Insert 20 test messages
for (let i = 0; i < 20; i++) {
  db.dlqmessages.insertOne({
    messageId: `test_bulk_${i}`,
    originalMessage: { index: i },
    errorReason: 'Test error',
    errorType: 'TIMEOUT_ERROR',
    retryCount: 3,
    dlqRetryCount: 0,
    firstFailedAt: new Date(),
    lastFailedAt: new Date(),
    status: 'dlq_pending',
    nextRetryAt: new Date(),
    metadata: { source: 'bulk_test', priority: 2 },
    replayAttempts: []
  });
}
```

**Observe:**
- Worker processes in batches (default: 10 messages per batch)
- Check logs for batch processing statistics

### 9.2 Test Priority Ordering

```javascript
// Insert high priority message
db.dlqmessages.insertOne({
  messageId: 'test_high_priority',
  originalMessage: { urgent: true },
  errorReason: 'Test',
  errorType: 'TIMEOUT_ERROR',
  retryCount: 3,
  dlqRetryCount: 0,
  firstFailedAt: new Date(),
  lastFailedAt: new Date(),
  status: 'dlq_pending',
  nextRetryAt: new Date(),
  metadata: { 
    source: 'api', 
    priority: 0  // Highest priority
  },
  replayAttempts: []
});
```

**Expected:** High priority message processed first.

---

## Step 10: Cleanup

### 10.1 Remove Test Messages

```javascript
// Remove all test messages
db.dlqmessages.deleteMany({ messageId: /^test_/ });
```

### 10.2 Stop Services

```bash
# Stop worker (Ctrl+C)

# Stop Docker containers (if used)
docker stop mongodb redis
docker rm mongodb redis
```

---

## Troubleshooting

### Worker Not Starting

**Check:**
1. MongoDB connection: `mongosh $MONGODB_URI`
2. Redis connection: `redis-cli -h $REDIS_HOST ping`
3. Environment variables in `.env`
4. Logs in `logs/error.log`

### Messages Not Processing

**Check:**
1. Message status: `db.dlqmessages.find({ status: 'dlq_pending' })`
2. `nextRetryAt` is in the past
3. No stale locks: `db.dlqmessages.find({ lockedBy: { $ne: null } })`
4. Worker logs for errors

### Lock Issues

```javascript
// Manually clear all locks
db.dlqmessages.updateMany(
  { lockedBy: { $ne: null } },
  { $set: { lockedBy: null, lockedAt: null, status: 'dlq_pending' } }
);
```

---

## Quick Test Script

Save this as `test-dlq.js`:

```javascript
// Connect to MongoDB
const { MongoClient } = require('mongodb');

async function quickTest() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('dlq_system');
  
  // Insert test message
  await db.collection('dlqmessages').insertOne({
    messageId: `test_${Date.now()}`,
    originalMessage: { test: true },
    errorReason: 'Test error',
    errorType: 'TIMEOUT_ERROR',
    retryCount: 3,
    dlqRetryCount: 0,
    firstFailedAt: new Date(),
    lastFailedAt: new Date(),
    status: 'dlq_pending',
    nextRetryAt: new Date(),
    metadata: { source: 'test', priority: 1 },
    replayAttempts: []
  });
  
  console.log('✅ Test message inserted');
  await client.close();
}

quickTest();
```

Run: `node test-dlq.js`

---

## Success Criteria

✅ Worker starts without errors  
✅ MongoDB and Redis connections established  
✅ TEMPORARY errors are retried with backoff  
✅ PERMANENT errors are marked as failed  
✅ UNKNOWN errors are flagged for manual review  
✅ Stale locks are cleared automatically  
✅ Graceful shutdown works correctly  
✅ Statistics are tracked and logged  

---

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Monitor production logs
3. Set up alerting for `dlq_manual` status
4. Configure off-peak retry hours
5. Adjust batch size and poll interval based on load
