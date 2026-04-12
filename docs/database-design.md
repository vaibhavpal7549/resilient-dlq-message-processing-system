# Database Design

## Collections

### `messages`

Primary lifecycle record for queued work and dead-letter outcomes.

Fields:

- `messageId`: unique business identifier for the message
- `payload`: raw message body
- `retryCount`: number of processing attempts
- `status`: `PROCESSING`, `FAILED`, `DLQ`, `REPLAYED`, `RESOLVED`
- `failureReason`: human-readable failure reason for failed and DLQ records
- `createdAt`, `updatedAt`: automatic Mongoose timestamps

Indexing strategy:

- unique index on `messageId`
- compound index on `status, updatedAt` for recent DLQ and replay views
- compound index on `status, retryCount, createdAt` for retry analysis
- partial index on `status, failureReason, updatedAt` scoped to `status = DLQ` for DLQ investigations

### `circuit_breaker_states`

Persisted breaker state for the main processing pipeline.

Fields:

- `breakerKey`: unique key for the breaker instance, default `primary`
- `state`: `OPEN`, `CLOSED`, `HALF_OPEN`
- `failureCount`: rolling failure count
- `threshold`: configured trip threshold
- `lastFailureTime`: last observed failure timestamp
- `createdAt`, `updatedAt`: automatic Mongoose timestamps

Indexing strategy:

- unique index on `breakerKey`
- compound index on `state, updatedAt` for operational dashboards

## Example Documents

### Message document

```json
{
  "_id": "66181ca9f8c3f5eb4d102001",
  "messageId": "msg_1712851001_9ad41f3b",
  "payload": {
    "orderId": "ORD-1042",
    "customerId": "CUS-9001",
    "simulateError": true
  },
  "retryCount": 3,
  "status": "DLQ",
  "failureReason": "External API timeout after 5000ms",
  "createdAt": "2026-04-12T04:30:10.120Z",
  "updatedAt": "2026-04-12T04:34:27.910Z"
}
```

### Circuit breaker document

```json
{
  "_id": "66181d6bf8c3f5eb4d102002",
  "breakerKey": "primary",
  "state": "OPEN",
  "failureCount": 17,
  "threshold": 0.5,
  "lastFailureTime": "2026-04-12T04:35:19.300Z",
  "createdAt": "2026-04-12T03:58:00.000Z",
  "updatedAt": "2026-04-12T04:35:19.300Z"
}
```
