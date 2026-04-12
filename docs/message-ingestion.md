# Message Ingestion And Retry Logic

## Route

`POST /api/messages`

Accepts a message payload, validates it, generates a unique `messageId`, stores the initial lifecycle record in MongoDB, and pushes the message into the processing queue.

## Retry Handling

- retry limit is loaded from `config/retry-policies.json`
- retry count is tracked in the queue payload and persisted in the `messages` collection
- simulated failures are triggered with `payload.simulateError`
- transient failures are retried with backoff
- permanent failures or exhausted retries are forwarded to the DLQ

## Sample Request

```http
POST /api/messages
Content-Type: application/json

{
  "payload": {
    "orderId": "ORD-1001",
    "simulateError": true,
    "errorType": "TIMEOUT_ERROR"
  },
  "source": "api-test",
  "priority": 1,
  "tags": ["demo", "retry"]
}
```

## Accepted Response

```json
{
  "success": true,
  "message": "Message accepted for processing",
  "messageId": "msg_1712851001_9ad41f3b",
  "status": "PROCESSING",
  "retryCount": 0,
  "retryLimit": 3
}
```

## Validation Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "\"payload\" is required"
  ]
}
```

## Exhausted Retry Outcome

The message lifecycle record is updated to:

```json
{
  "messageId": "msg_1712851001_9ad41f3b",
  "status": "DLQ",
  "retryCount": 3,
  "failureReason": "External API timeout after 5000ms"
}
```
