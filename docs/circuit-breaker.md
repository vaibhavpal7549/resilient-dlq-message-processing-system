# Circuit Breaker

## Logic

The circuit breaker lives in [circuitBreaker.js](/d:/dlq/backend/src/circuit-breaker/circuitBreaker.js:1).

It tracks:

- request failure rate over a sliding time window
- DLQ growth between evaluation cycles
- current pending DLQ backlog

Thresholds come from [config/circuit-breaker.json](/d:/dlq/config/circuit-breaker.json:1):

- `failureThreshold`
- `dlqGrowthThreshold`
- `maxPendingDlqMessages`
- `openTimeoutMs`
- `halfOpenMaxRequests`
- `halfOpenSuccessThreshold`

## State Transitions

- `CLOSED` -> `OPEN`
  when failure rate exceeds threshold, DLQ growth exceeds threshold, or pending DLQ backlog exceeds threshold
- `OPEN` -> `HALF_OPEN`
  automatically after the cooldown period (`openTimeoutMs`)
- `HALF_OPEN` -> `CLOSED`
  when enough test requests succeed
- `HALF_OPEN` -> `OPEN`
  when a test request fails or the half-open success rate is too low

## Blocking Behavior

New message ingestion is blocked by the middleware in [backend/src/api/middleware/circuitBreaker.js](/d:/dlq/backend/src/api/middleware/circuitBreaker.js:1) when the breaker is `OPEN`.

The `POST /api/messages` route now uses that middleware.

## API Endpoint

Circuit breaker state is exposed at:

`GET /api/system/circuit-breaker`

Example response:

```json
{
  "success": true,
  "state": "OPEN",
  "retryAfter": 27,
  "metrics": {
    "state": "OPEN",
    "failureRate": 0.67,
    "threshold": 0.5,
    "dlqGrowthThreshold": 5,
    "maxPendingDlqMessages": 25,
    "lastDLQGrowth": 8,
    "lastKnownDLQTotal": 32,
    "lastKnownPendingDLQ": 26
  }
}
```
