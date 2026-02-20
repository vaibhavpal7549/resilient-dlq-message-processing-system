# Resilient DLQ Message Processing System — API Documentation

> **Base URL:** `http://localhost:3000`  
> **API Version:** `1.0.0`  
> **Content-Type:** `application/json`

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Circuit Breaker](#circuit-breaker)
- [Endpoints](#endpoints)
  - [Root](#root)
  - [Messages](#messages-api)
    - [POST /api/messages](#post-apimessages)
  - [DLQ (Dead Letter Queue)](#dlq-api)
    - [GET /api/dlq](#get-apidlq)
    - [GET /api/dlq/stats](#get-apidlqstats)
    - [GET /api/dlq/:id](#get-apidlqid)
    - [POST /api/dlq/:id/replay](#post-apidlqidreplay)
    - [POST /api/dlq/replay-batch](#post-apidlqreplay-batch)
  - [System](#system-api)
    - [GET /api/system/health](#get-apisystemhealth)
- [Data Models](#data-models)
- [Error Responses](#error-responses)
- [Status Codes](#status-codes)

---

## Overview

The Resilient DLQ Message Processing System provides a REST API to submit messages for processing, inspect dead-letter queue contents, replay failed messages, and monitor system health.

Messages flow through three stages:

```
Producer → Primary Queue → Processor → [Success] ✓
                                      ↓ [Failure]
                               Dead Letter Queue (DLQ)
                                      ↓
                            Manual / Automated Replay
```

| Route Prefix     | Description                        |
|------------------|------------------------------------|
| `/api/messages`  | Submit messages for processing     |
| `/api/dlq`       | Manage dead-letter queue messages  |
| `/api/system`    | System health and diagnostics      |

---

## Authentication

This version does not require authentication. All endpoints are publicly accessible.  
> ⚠️ It is strongly recommended to add authentication (e.g., API keys or JWT) before deploying to production.

---

## Rate Limiting

All `/api/*` routes are protected by a rate limiter.

| Parameter       | Default Value     | Env Variable                  |
|-----------------|-------------------|-------------------------------|
| Window          | 60 seconds        | `RATE_LIMIT_WINDOW_MS`        |
| Max requests    | 100 per window    | `RATE_LIMIT_MAX_REQUESTS`     |

**Rate limit exceeded response — `429 Too Many Requests`:**
```json
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 60
}
```

---

## Circuit Breaker

The circuit breaker protects the message submission endpoint from cascading failures.

| State       | Description                                              |
|-------------|----------------------------------------------------------|
| `CLOSED`    | Normal operation — all requests pass through            |
| `OPEN`      | Requests are blocked — service is recovering            |
| `HALF_OPEN` | Limited traffic allowed — testing recovery              |

**When `OPEN` — `503 Service Unavailable`:**
```json
{
  "success": false,
  "error": "Service temporarily unavailable",
  "reason": "Circuit breaker is open",
  "retryAfter": "30 seconds",
  "state": "OPEN"
}
```

The `Retry-After` HTTP header is also set on `OPEN` responses.

---

## Endpoints

---

### Root

#### `GET /`

Returns basic service information.

**Response `200 OK`:**
```json
{
  "service": "DLQ Message Processing System",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "messages": "POST /api/messages",
    "health": "GET /api/system/health"
  }
}
```

---

## Messages API

### `POST /api/messages`

Submit a new message for processing. The message is validated, assigned a unique ID, and enqueued for processing.

> 🛡️ Protected by the **Circuit Breaker middleware** — returns `503` if the circuit is `OPEN`.

**Request Body:**

| Field      | Type     | Required | Description                                              |
|------------|----------|----------|----------------------------------------------------------|
| `payload`  | `object` | ✅ Yes   | The message payload (any JSON object)                    |
| `source`   | `string` | No       | Source system identifier. Defaults to `"api"`            |
| `priority` | `number` | No       | Priority level: `1` (high), `2` (medium), `3` (low). Defaults to `2` |
| `tags`     | `string[]`| No      | Array of string tags for categorization                  |
| `headers`  | `object` | No       | Custom headers (forwarded from request)                  |

**Example Request:**
```json
{
  "payload": {
    "orderId": "ORD-9876",
    "action": "process_payment",
    "amount": 149.99,
    "currency": "USD"
  },
  "source": "order-service",
  "priority": 1,
  "tags": ["payment", "high-value"]
}
```

**Response `202 Accepted`:**
```json
{
  "success": true,
  "message": "Message accepted for processing",
  "messageId": "msg_1708422300000_a1b2c3d4",
  "status": "queued"
}
```

**Error Responses:**

| Status | Reason                                      |
|--------|---------------------------------------------|
| `400`  | Validation failed — missing or invalid fields |
| `503`  | Circuit breaker is `OPEN` or `HALF_OPEN`    |
| `500`  | Internal server error                        |

**Validation error `400`:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": ["\"payload\" is required"]
}
```

---

## DLQ API

### `GET /api/dlq`

List all DLQ messages with optional filtering, sorting, and pagination.

**Query Parameters:**

| Parameter   | Type     | Default      | Description                                     |
|-------------|----------|--------------|-------------------------------------------------|
| `status`    | `string` | —            | Filter by status (`dlq_pending`, `dlq_processing`, `dlq_resolved`, `dlq_failed`, `dlq_replayed`) |
| `errorType` | `string` | —            | Filter by error type                            |
| `source`    | `string` | —            | Filter by originating source system             |
| `startDate` | `string` | —            | ISO 8601 date — filter messages created after   |
| `endDate`   | `string` | —            | ISO 8601 date — filter messages created before  |
| `page`      | `number` | `1`          | Page number for pagination                      |
| `limit`     | `number` | `20`         | Number of messages per page (max recommended: 100) |
| `sortBy`    | `string` | `createdAt`  | Field to sort by                                |
| `sortOrder` | `string` | `desc`       | Sort direction: `asc` or `desc`                 |

**Example Request:**
```
GET /api/dlq?status=dlq_failed&page=1&limit=10&sortOrder=desc
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d1a2b3c4e5f6a7b8c9d0e1",
      "messageId": "msg_1708422300000_a1b2c3d4",
      "status": "dlq_failed",
      "errorType": "PROCESSING_ERROR",
      "retryCount": 3,
      "originalMessage": { "orderId": "ORD-9876" },
      "metadata": {
        "source": "order-service",
        "priority": 1,
        "tags": ["payment"]
      },
      "createdAt": "2024-02-20T06:45:00.000Z",
      "updatedAt": "2024-02-20T07:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

---

### `GET /api/dlq/stats`

Get aggregated statistics about the DLQ — total message count, breakdown by status, and top error types.

> ⚠️ **Call this endpoint before** `GET /api/dlq/:id` — Express resolves `/stats` before `/:id`.

**Response `200 OK`:**
```json
{
  "success": true,
  "stats": {
    "total": 127,
    "byStatus": {
      "dlq_failed": 45,
      "dlq_processing": 12,
      "dlq_resolved": 60,
      "dlq_pending": 10
    },
    "topErrors": [
      { "_id": "PROCESSING_ERROR", "count": 30 },
      { "_id": "TIMEOUT_ERROR", "count": 10 },
      { "_id": "VALIDATION_ERROR", "count": 5 }
    ]
  }
}
```

---

### `GET /api/dlq/:id`

Retrieve a single DLQ message by its MongoDB document ID.

**Path Parameters:**

| Parameter | Type     | Required | Description              |
|-----------|----------|----------|--------------------------|
| `id`      | `string` | ✅ Yes   | MongoDB ObjectId of the DLQ message |

**Example Request:**
```
GET /api/dlq/65d1a2b3c4e5f6a7b8c9d0e1
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "_id": "65d1a2b3c4e5f6a7b8c9d0e1",
    "messageId": "msg_1708422300000_a1b2c3d4",
    "status": "dlq_failed",
    "errorType": "PROCESSING_ERROR",
    "retryCount": 3,
    "originalMessage": { "orderId": "ORD-9876", "action": "process_payment" },
    "replayAttempts": [],
    "metadata": {
      "source": "order-service",
      "priority": 1,
      "tags": ["payment", "high-value"]
    },
    "createdAt": "2024-02-20T06:45:00.000Z",
    "updatedAt": "2024-02-20T07:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Reason                      |
|--------|-----------------------------|
| `404`  | DLQ message not found       |
| `500`  | Failed to retrieve message  |

---

### `POST /api/dlq/:id/replay`

Manually replay a single DLQ message by re-enqueuing it to the primary processing queue. The DLQ record is updated with status `dlq_replayed` and a replay attempt is logged.

**Path Parameters:**

| Parameter | Type     | Required | Description              |
|-----------|----------|----------|--------------------------|
| `id`      | `string` | ✅ Yes   | MongoDB ObjectId of the DLQ message |

**Example Request:**
```
POST /api/dlq/65d1a2b3c4e5f6a7b8c9d0e1/replay
```
> No request body required.

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Message replayed successfully",
  "replayMessageId": "replay_msg_1708422300000_a1b2c3d4_1708425900000"
}
```

**Error Responses:**

| Status | Reason                                        |
|--------|-----------------------------------------------|
| `404`  | DLQ message not found                         |
| `409`  | Message is currently being processed          |
| `500`  | Failed to replay message                      |

**Conflict error `409`:**
```json
{
  "success": false,
  "error": "Message is currently being processed"
}
```

---

### `POST /api/dlq/replay-batch`

Replay multiple DLQ messages at once using filters. Supports a `dryRun` mode to preview which messages would be replayed before committing.

**Request Body:**

| Field              | Type      | Default | Description                                         |
|--------------------|-----------|---------|-----------------------------------------------------|
| `filters`          | `object`  | `{}`    | Filters to select messages for replay               |
| `filters.errorType`| `string`  | —       | Only replay messages of this error type             |
| `filters.source`   | `string`  | —       | Only replay messages from this source               |
| `filters.startDate`| `string`  | —       | ISO 8601 — replay messages created after this date  |
| `filters.endDate`  | `string`  | —       | ISO 8601 — replay messages created before this date |
| `batchSize`        | `number`  | `100`   | Maximum number of messages to replay                |
| `dryRun`           | `boolean` | `false` | If `true`, returns a preview without actually replaying |

**Example Request (dry run):**
```json
{
  "filters": {
    "errorType": "TIMEOUT_ERROR",
    "startDate": "2024-02-01T00:00:00.000Z"
  },
  "batchSize": 50,
  "dryRun": true
}
```

**Response `200 OK` (dry run):**
```json
{
  "success": true,
  "dryRun": true,
  "message": "Would replay 18 messages",
  "preview": [
    { "id": "65d1a2b3c4e5f6a7b8c9d0e1", "messageId": "msg_abc", "errorType": "TIMEOUT_ERROR" },
    { "id": "65d1a2b3c4e5f6a7b8c9d0e2", "messageId": "msg_def", "errorType": "TIMEOUT_ERROR" }
  ]
}
```

**Response `200 OK` (actual replay):**
```json
{
  "success": true,
  "message": "Batch replay completed",
  "results": {
    "total": 18,
    "success": 17,
    "failed": 1
  }
}
```

> **Note:** Only messages with status `dlq_pending` are selected for batch replay.

---

## System API

### `GET /api/system/health`

Returns a comprehensive health report of all system components — database connections, queue metrics, circuit breaker state, processor status, and DLQ statistics.

**Response `200 OK` (healthy):**
```json
{
  "success": true,
  "healthy": true,
  "timestamp": "2024-02-20T07:00:00.000Z",
  "components": {
    "mongodb": {
      "healthy": true,
      "status": "connected"
    },
    "redis": {
      "healthy": true,
      "status": "connected"
    },
    "queue": {
      "healthy": true,
      "metrics": {
        "waiting": 4,
        "active": 2,
        "completed": 1024,
        "failed": 12
      }
    },
    "circuitBreaker": {
      "state": "CLOSED",
      "failureRate": 0.02,
      "metrics": {
        "totalRequests": 500,
        "failures": 10,
        "successes": 490
      }
    },
    "processor": {
      "healthy": true,
      "metrics": {
        "isProcessing": true,
        "processedCount": 1024,
        "errorCount": 12
      }
    },
    "dlq": {
      "healthy": true,
      "stats": {
        "total": 127,
        "pending": 10,
        "processing": 2
      }
    }
  }
}
```

**Response `503 Service Unavailable`** (one or more components unhealthy):
```json
{
  "success": true,
  "healthy": false,
  "timestamp": "2024-02-20T07:00:00.000Z",
  "components": {
    "mongodb": { "healthy": false, "status": "disconnected" },
    "redis":   { "healthy": true,  "status": "connected"    }
  }
}
```

---

## Data Models

### DLQ Message

| Field             | Type       | Description                                                  |
|-------------------|------------|--------------------------------------------------------------|
| `_id`             | `ObjectId` | MongoDB document ID                                          |
| `messageId`       | `string`   | Original message ID (prefixed `msg_` or `replay_`)          |
| `status`          | `string`   | Current status (see [Message Statuses](#message-statuses))   |
| `errorType`       | `string`   | Categorized error type (e.g. `PROCESSING_ERROR`)            |
| `retryCount`      | `number`   | Number of retry attempts made                                |
| `originalMessage` | `object`   | The original message payload                                 |
| `replayAttempts`  | `array`    | History of replay attempts                                   |
| `metadata.source` | `string`   | Source system that produced the message                      |
| `metadata.priority`| `number`  | Priority: `1` = high, `2` = medium, `3` = low               |
| `metadata.tags`   | `string[]` | Tags attached to the message                                 |
| `createdAt`       | `Date`     | When the message entered the DLQ                             |
| `updatedAt`       | `Date`     | Last time the document was modified                          |

### Message Statuses

| Status           | Description                                 |
|------------------|---------------------------------------------|
| `dlq_pending`    | In DLQ, awaiting replay                     |
| `dlq_processing` | Currently being retried by the processor    |
| `dlq_failed`     | Exhausted all retry attempts                |
| `dlq_resolved`   | Successfully processed after replay         |
| `dlq_replayed`   | Sent back to primary queue via API replay   |

---

## Error Responses

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "More specific error info (may be string or array)"
}
```

In **development mode** (`NODE_ENV=development`), a `stack` field is included:
```json
{
  "success": false,
  "error": "Internal server error",
  "stack": "Error: ...\n    at ..."
}
```

---

## Status Codes

| Code  | Meaning                                                       |
|-------|---------------------------------------------------------------|
| `200` | OK — request succeeded                                        |
| `202` | Accepted — message queued for async processing               |
| `400` | Bad Request — validation failed                              |
| `404` | Not Found — resource does not exist                          |
| `409` | Conflict — resource is in an incompatible state              |
| `429` | Too Many Requests — rate limit exceeded                      |
| `500` | Internal Server Error — unexpected server failure            |
| `503` | Service Unavailable — circuit breaker open or system unhealthy |

---

## Quick Reference

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| `GET`  | `/`                       | Service info                       |
| `POST` | `/api/messages`           | Submit a message for processing    |
| `GET`  | `/api/dlq`                | List DLQ messages (paginated)      |
| `GET`  | `/api/dlq/stats`          | DLQ aggregate statistics           |
| `GET`  | `/api/dlq/:id`            | Get single DLQ message             |
| `POST` | `/api/dlq/:id/replay`     | Replay a single DLQ message        |
| `POST` | `/api/dlq/replay-batch`   | Batch replay filtered messages     |
| `GET`  | `/api/system/health`      | Full system health report          |

---

*Generated for Resilient DLQ Message Processing System v1.0.0*
