# Dead Letter Queue Lifecycle

## DLQ Message Journey

```mermaid
flowchart TB
    subgraph "Entry to DLQ"
        FAIL[Message Failed<br/>After Max Retries] --> ROUTE[DLQ Router]
        ROUTE --> ENRICH[Enrich with Metadata<br/>Error, Context, History]
        ENRICH --> WRITE[Write to MongoDB]
        WRITE --> STATUS_PENDING[(Status: dlq_pending)]
    end
    
    subgraph "DLQ Processing"
        STATUS_PENDING --> POLL[DLQ Worker Polls<br/>Every 30 seconds]
        POLL --> LOCK[Acquire Distributed Lock]
        LOCK --> STATUS_PROCESSING[(Status: dlq_processing)]
        
        STATUS_PROCESSING --> ANALYZE[Analyze Error Pattern]
        ANALYZE --> STRATEGY{Select Retry<br/>Strategy}
        
        STRATEGY -->|Transient| IMMEDIATE[Immediate Retry<br/>1min, 5min, 15min]
        STRATEGY -->|Rate Limit| SCHEDULED[Scheduled Retry<br/>Off-Peak Hours]
        STRATEGY -->|Unknown| MANUAL[Manual Intervention]
        
        IMMEDIATE --> RETRY_ATTEMPT[Execute Retry]
        SCHEDULED --> SCHEDULE_QUEUE[Schedule Queue]
        SCHEDULE_QUEUE --> RETRY_ATTEMPT
        
        RETRY_ATTEMPT --> RETRY_RESULT{Success?}
        
        RETRY_RESULT -->|Yes| STATUS_RESOLVED[(Status: dlq_resolved)]
        RETRY_RESULT -->|No| RETRY_COUNT{DLQ Retry<br/>< 5?}
        
        RETRY_COUNT -->|Yes| UPDATE_PENDING[Update Metadata]
        UPDATE_PENDING --> STATUS_PENDING
        
        RETRY_COUNT -->|No| STATUS_FAILED[(Status: dlq_failed)]
        
        MANUAL --> HUMAN_REVIEW[Human Review]
        HUMAN_REVIEW --> MANUAL_DECISION{Resolution?}
        MANUAL_DECISION -->|Fixed| MANUAL_REPLAY[Manual Replay]
        MANUAL_DECISION -->|Discard| STATUS_ARCHIVED[(Status: dlq_archived)]
        
        MANUAL_REPLAY --> RETRY_ATTEMPT
    end
    
    style STATUS_PENDING fill:#FFD700
    style STATUS_PROCESSING fill:#87CEEB
    style STATUS_RESOLVED fill:#90EE90
    style STATUS_FAILED fill:#FF6347
    style STATUS_ARCHIVED fill:#D3D3D3
```

## DLQ State Machine

```mermaid
stateDiagram-v2
    [*] --> dlq_pending: Max Retries Exceeded
    
    dlq_pending --> dlq_processing: Worker Picks Up
    dlq_pending --> dlq_pending: Replay Scheduled
    
    dlq_processing --> dlq_resolved: Retry Success
    dlq_processing --> dlq_pending: Retry Failed (Count < 5)
    dlq_processing --> dlq_failed: Retry Failed (Count ≥ 5)
    dlq_processing --> dlq_manual: Requires Human Review
    
    dlq_manual --> dlq_processing: Manual Replay
    dlq_manual --> dlq_archived: Manual Discard
    
    dlq_failed --> dlq_archived: Auto-Archive (90 days)
    dlq_resolved --> [*]: Retention Policy (30 days)
    dlq_archived --> [*]: Permanent Archive
```

## DLQ Worker Service

### Worker Architecture

```mermaid
graph LR
    subgraph "DLQ Worker Pool"
        W1[Worker 1] --> MONGO[(MongoDB)]
        W2[Worker 2] --> MONGO
        W3[Worker 3] --> MONGO
    end
    
    subgraph "Distributed Coordination"
        MONGO --> LOCK[Distributed Lock<br/>Redis/MongoDB]
        LOCK --> W1
        LOCK --> W2
        LOCK --> W3
    end
    
    subgraph "Retry Strategies"
        W1 --> IMMEDIATE_RETRY[Immediate Retry]
        W2 --> SCHEDULED_RETRY[Scheduled Retry]
        W3 --> CONDITIONAL_RETRY[Conditional Retry]
    end
```

### Polling Strategy

**Interval**: 30 seconds

**Query**:
```javascript
db.dlq_messages.find({
  status: 'dlq_pending',
  nextRetryAt: { $lte: new Date() },
  lockedBy: null
})
.sort({ priority: -1, createdAt: 1 })
.limit(10);
```

**Distributed Locking**:
```javascript
db.dlq_messages.findOneAndUpdate(
  { _id: messageId, lockedBy: null },
  {
    $set: {
      lockedBy: workerId,
      lockedAt: new Date(),
      status: 'dlq_processing'
    }
  }
);
```

## Retry Strategies

### 1. Immediate Retry
**Use Cases**: Network timeouts, temporary unavailability

**Backoff**: 1min → 5min → 15min → 30min → 1hr

```javascript
const backoffMinutes = [1, 5, 15, 30, 60];
const nextRetryAt = new Date(
  Date.now() + backoffMinutes[retryCount] * 60 * 1000
);
```

### 2. Scheduled Retry
**Use Cases**: API rate limits, quota exhaustion

**Schedule**: Off-peak hours (2am, 3am, 4am)

```javascript
const offPeakHours = [2, 3, 4];
const nextRetryAt = getNextOffPeakTime(offPeakHours);
```

### 3. Conditional Retry
**Use Cases**: Downstream outages, system issues

**Conditions**:
- Circuit breaker CLOSED
- CPU < 80%
- Memory < 85%
- DB connections available

### 4. Manual Intervention
**Use Cases**: Unknown errors, business violations

**Process**:
1. Flag with `status: 'dlq_manual'`
2. Alert operations team
3. Provide debugging interface
4. Manual decision: replay, discard, or modify

## DLQ Metadata Schema

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  messageId: "msg_1707658080_abc123",
  
  originalMessage: {
    userId: "user_123",
    action: "process_payment",
    amount: 99.99
  },
  
  errorReason: "External API timeout after 5000ms",
  errorStack: "Error: timeout\n  at processPayment...",
  errorType: "TIMEOUT_ERROR",
  
  retryCount: 3,
  dlqRetryCount: 2,
  firstFailedAt: ISODate("2026-02-11T12:00:00Z"),
  lastFailedAt: ISODate("2026-02-11T12:00:07Z"),
  
  status: "dlq_processing",
  lockedBy: "worker_node_2",
  lockedAt: ISODate("2026-02-11T12:05:00Z"),
  nextRetryAt: ISODate("2026-02-11T12:10:00Z"),
  
  metadata: {
    source: "payment-service",
    priority: 1,
    tags: ["payment", "critical"],
    systemState: {
      cpuUsage: 0.75,
      memoryUsage: 0.60
    }
  },
  
  replayAttempts: [{
    timestamp: ISODate("2026-02-11T12:05:30Z"),
    workerId: "worker_node_2",
    strategy: "immediate_retry",
    result: "failed"
  }],
  
  createdAt: ISODate("2026-02-11T12:00:07Z"),
  updatedAt: ISODate("2026-02-11T12:05:30Z")
}
```

## Replay Mechanism

### Replay Flow

```mermaid
flowchart LR
    START([Replay Trigger]) --> VALIDATE[Validate Args]
    VALIDATE --> HEALTH{System<br/>Healthy?}
    
    HEALTH -->|No| ABORT[Abort]
    HEALTH -->|Yes| QUERY[Query DLQ]
    
    QUERY --> DRY_RUN{Dry Run?}
    DRY_RUN -->|Yes| PREVIEW[Preview]
    DRY_RUN -->|No| BATCH[Batch 100]
    
    BATCH --> REINJECT[Re-inject]
    REINJECT --> TRACK[Track Results]
    TRACK --> MORE{More?}
    
    MORE -->|Yes| BATCH
    MORE -->|No| REPORT[Report]
```

### Shell Script Usage

```bash
# Replay timeout errors from last 24 hours
./replay-dlq.sh \
  --error-type "TIMEOUT_ERROR" \
  --start-date "2026-02-10T00:00:00Z" \
  --end-date "2026-02-11T00:00:00Z" \
  --batch-size 100

# Dry run preview
./replay-dlq.sh \
  --error-type "RATE_LIMIT_ERROR" \
  --dry-run true
```

### Node.js Implementation

```javascript
async function replayDLQ(options) {
  const { errorType, startDate, endDate, batchSize = 100, dryRun = false } = options;
  
  const query = { status: 'dlq_pending' };
  if (errorType) query.errorType = errorType;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const messages = await db.collection('dlq_messages').find(query).toArray();
  
  if (dryRun) {
    console.log(`Preview: ${messages.length} messages`);
    return;
  }
  
  let successCount = 0;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    for (const msg of batch) {
      await enqueueMessage(msg.originalMessage);
      successCount++;
    }
    await sleep(1000);
  }
  
  console.log(`Replayed ${successCount} messages`);
}
```

## Metrics & Monitoring

### Key Metrics
- DLQ ingestion rate (msgs/sec)
- DLQ resolution rate (%)
- DLQ backlog (total pending)
- Average time in DLQ
- Error type distribution
- Replay success rate

### Alerts

```yaml
alerts:
  - name: HighDLQIngestionRate
    condition: dlq_ingestion_rate > 100/min
    severity: warning
  
  - name: DLQBacklogGrowing
    condition: dlq_backlog > 10000
    severity: critical
  
  - name: LowResolutionRate
    condition: dlq_resolution_rate < 0.5
    severity: warning
```

## Retention Policy

| Status | Retention | Action |
|--------|-----------|--------|
| `dlq_resolved` | 30 days | Auto-delete |
| `dlq_failed` | 90 days | Cold storage |
| `dlq_archived` | 1 year | Permanent archive |
| `dlq_pending` | No limit | Keep until resolved |
