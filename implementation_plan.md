# Implementation Plan: DLQ Message Processing System

## Overview

This plan outlines the step-by-step implementation of a production-grade Dead Letter Queue (DLQ) message processing system based on the PRD requirements. The system will be built using Node.js, Express.js, MongoDB, React.js, and will include circuit breaker protection, retry mechanisms, and comprehensive observability.

---

## Architecture Decisions

### Key Changes from Original Design

> [!IMPORTANT]
> **Unix Message Queue → Redis**: While the PRD specifies Unix message queues, we'll use **Redis** instead for the following reasons:
> - Cross-platform compatibility (Windows support)
> - Better distributed system support
> - Built-in persistence options
> - Simpler deployment with Docker
> - Production-ready with clustering support

### Technology Stack Confirmation

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **API Server** | Express.js + Node.js | Matches PRD, excellent async support |
| **Message Queue** | Redis (Bull queue) | Cross-platform, production-ready |
| **Database** | MongoDB | Matches PRD, flexible schema for metadata |
| **DLQ Worker** | Node.js background service | Matches PRD requirements |
| **Circuit Breaker** | Custom implementation | Full control over behavior |
| **Frontend** | React.js + Tailwind CSS | Matches PRD exactly |
| **Distributed Lock** | Redis | Prevents duplicate DLQ processing |

---

## Proposed Changes

### Component Architecture

```
dlq-system/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── api/               # REST API routes
│   │   ├── queue/             # Redis queue manager
│   │   ├── processor/         # Message processing logic
│   │   ├── retry/             # Retry manager
│   │   ├── circuit-breaker/   # Circuit breaker implementation
│   │   ├── dlq/               # DLQ router and persistence
│   │   ├── db/                # MongoDB models and connection
│   │   └── utils/             # Logging, metrics, helpers
│   ├── config/                # Configuration files
│   ├── tests/                 # Unit and integration tests
│   └── package.json
│
├── worker/                     # DLQ worker service
│   ├── src/
│   │   ├── dlqWorker.js       # Main worker logic
│   │   ├── strategies/        # Retry strategies
│   │   └── utils/             # Shared utilities
│   └── package.json
│
├── frontend/                   # React.js dashboard
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Dashboard pages
│   │   ├── services/          # API client
│   │   └── App.jsx
│   ├── public/
│   └── package.json
│
├── scripts/                    # Automation scripts
│   ├── replay-dlq.sh          # Bulk replay script
│   └── health-check.sh        # System health check
│
├── config/                     # Git-tracked configuration
│   ├── retry-policies.json
│   ├── circuit-breaker.json
│   └── dlq-routing.json
│
├── docker/
│   ├── docker-compose.yml     # Full stack deployment
│   └── Dockerfile.*           # Individual service containers
│
└── docs/                       # Documentation
    └── API.md
```

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure (Day 1)

**Goal**: Setup project structure and core infrastructure

#### Tasks:
1. **Initialize monorepo structure**
   ```bash
   mkdir -p backend/src/{api,queue,processor,retry,circuit-breaker,dlq,db,utils}
   mkdir -p worker/src/{strategies,utils}
   mkdir -p frontend/src/{components,pages,services}
   mkdir -p scripts config docker docs
   ```

2. **Setup backend package.json**
   - Dependencies: `express`, `mongoose`, `bull`, `ioredis`, `dotenv`, `winston`, `joi`
   - Dev dependencies: `nodemon`, `jest`, `supertest`

3. **Setup worker package.json**
   - Dependencies: `mongoose`, `bull`, `ioredis`, `winston`, `node-cron`

4. **Setup frontend package.json**
   - Dependencies: `react`, `react-router-dom`, `axios`, `tailwindcss`
   - Dev dependencies: `vite`, `@vitejs/plugin-react`

5. **Create environment configuration**
   - `.env.example` with all required variables
   - Config loader using `dotenv` and validation

6. **Setup MongoDB connection**
   - Connection pooling
   - Error handling
   - Reconnection logic

7. **Setup Redis connection**
   - Connection with retry logic
   - Health check

8. **Setup logging infrastructure**
   - Winston logger with multiple transports
   - Log levels: error, warn, info, debug
   - Structured logging format

---

### Phase 2: Core Backend - Message Processing (Day 2-3)

**Goal**: Implement message ingestion and primary processing

#### [MODIFY] [backend/src/api/server.js](file:///d:/dlq/backend/src/api/server.js)
- Express server setup
- Middleware configuration (CORS, body-parser, error handler)
- Route mounting
- Graceful shutdown

#### [NEW] [backend/src/api/routes/messages.js](file:///d:/dlq/backend/src/api/routes/messages.js)
- `POST /api/messages` - Message ingestion endpoint
- Request validation using Joi
- Circuit breaker check before accepting
- Enqueue to Redis queue

#### [NEW] [backend/src/queue/queueManager.js](file:///d:/dlq/backend/src/queue/queueManager.js)
- Bull queue initialization
- Enqueue/dequeue operations
- Queue event handlers (completed, failed, stalled)
- Queue metrics (depth, processing rate)

#### [NEW] [backend/src/processor/primaryProcessor.js](file:///d:/dlq/backend/src/processor/primaryProcessor.js)
- Worker pool setup (configurable concurrency)
- Message processing logic (simulated business logic)
- Success/failure handling
- Integration with retry manager

#### [NEW] [backend/src/retry/retryManager.js](file:///d:/dlq/backend/src/retry/retryManager.js)
- Retry count tracking
- Exponential backoff calculation: `delay = 1000 * (2 ^ retryCount)`
- Jitter addition (±20%)
- Max retry check (default: 3)
- Re-enqueue or route to DLQ

**Validation**:
- Submit test message via API
- Verify processing and retry behavior
- Confirm exponential backoff timing

---

### Phase 3: Dead Letter Queue System (Day 4-5)

**Goal**: Implement DLQ routing, persistence, and worker

#### [NEW] [backend/src/dlq/dlqRouter.js](file:///d:/dlq/backend/src/dlq/dlqRouter.js)
- Route failed messages to DLQ
- Enrich with metadata (error, retries, timestamps)
- Persist to MongoDB
- Emit DLQ events for monitoring

#### [NEW] [backend/src/db/models/DLQMessage.js](file:///d:/dlq/backend/src/db/models/DLQMessage.js)
- MongoDB schema matching design:
  ```javascript
  {
    messageId: String (unique),
    originalMessage: Object,
    errorReason: String,
    errorStack: String,
    errorType: String,
    retryCount: Number,
    dlqRetryCount: Number,
    firstFailedAt: Date,
    lastFailedAt: Date,
    status: String (enum),
    lockedBy: String,
    lockedAt: Date,
    nextRetryAt: Date,
    metadata: Object,
    replayAttempts: Array
  }
  ```
- Indexes for efficient querying

#### [NEW] [worker/src/dlqWorker.js](file:///d:/dlq/worker/src/dlqWorker.js)
- Poll MongoDB every 30 seconds
- Acquire distributed lock (Redis)
- Process DLQ messages
- Apply retry strategies
- Update message status

#### [NEW] [worker/src/strategies/retryStrategies.js](file:///d:/dlq/worker/src/strategies/retryStrategies.js)
- Immediate retry: 1min → 5min → 15min → 30min → 1hr
- Scheduled retry: Off-peak hours (2am, 3am, 4am)
- Conditional retry: Wait for system health
- Manual intervention: Flag for human review

**Validation**:
- Force message failures
- Verify DLQ persistence
- Confirm worker picks up messages
- Test retry strategies

---

### Phase 4: Circuit Breaker Pattern (Day 6)

**Goal**: Implement circuit breaker for system protection

#### [NEW] [backend/src/circuit-breaker/circuitBreaker.js](file:///d:/dlq/backend/src/circuit-breaker/circuitBreaker.js)
- Three-state machine: CLOSED, OPEN, HALF_OPEN
- Failure rate monitoring (60s sliding window)
- State transitions based on thresholds
- Integration points for all components

**Configuration**:
```javascript
{
  failureThreshold: 0.5,      // 50%
  timeWindowMs: 60000,        // 60s
  openTimeoutMs: 30000,       // 30s
  halfOpenMaxRequests: 10,
  halfOpenSuccessThreshold: 0.8
}
```

#### [MODIFY] [backend/src/api/routes/messages.js](file:///d:/dlq/backend/src/api/routes/messages.js)
- Add circuit breaker middleware
- Return 503 when circuit is OPEN
- Limit traffic when HALF_OPEN

#### [MODIFY] [backend/src/processor/primaryProcessor.js](file:///d:/dlq/backend/src/processor/primaryProcessor.js)
- Report success/failure to circuit breaker
- Pause processing when circuit is OPEN

**Validation**:
- Simulate high failure rate (>50%)
- Verify circuit trips to OPEN
- Confirm 503 responses
- Test auto-recovery to HALF_OPEN → CLOSED

---

### Phase 5: DLQ Management APIs (Day 7)

**Goal**: Create REST APIs for DLQ management

#### [NEW] [backend/src/api/routes/dlq.js](file:///d:/dlq/backend/src/api/routes/dlq.js)

**Endpoints**:

1. **GET /api/dlq**
   - List all DLQ messages
   - Filters: status, errorType, dateRange, source
   - Pagination: page, limit
   - Sorting: createdAt, retryCount

2. **GET /api/dlq/:id**
   - Get single DLQ message by ID
   - Include full metadata and replay history

3. **POST /api/dlq/:id/replay**
   - Replay single message
   - Validate system health before replay
   - Update status to `dlq_replayed`
   - Re-inject to primary queue

4. **POST /api/dlq/replay-batch**
   - Replay multiple messages
   - Body: `{ filters: {...}, batchSize: 100 }`
   - Dry-run mode support
   - Return replay results

5. **GET /api/system/health**
   - System metrics
   - Circuit breaker state
   - Queue depths
   - DLQ statistics
   - MongoDB/Redis connection status

**Validation**:
- Test all endpoints with Postman/curl
- Verify filtering and pagination
- Test replay functionality
- Confirm health endpoint accuracy

---

### Phase 6: Replay Mechanism (Day 8)

**Goal**: Implement replay logic and automation scripts

#### [NEW] [backend/src/dlq/replayService.js](file:///d:/dlq/backend/src/dlq/replayService.js)
- Single message replay
- Batch replay with filters
- Health check validation
- Replay tracking and metrics
- Status updates

#### [NEW] [scripts/replay-dlq.sh](file:///d:/dlq/scripts/replay-dlq.sh)
```bash
#!/bin/bash
# Bulk replay script with filters

node backend/src/scripts/replay.js \
  --error-type "$ERROR_TYPE" \
  --start-date "$START_DATE" \
  --end-date "$END_DATE" \
  --batch-size 100 \
  --dry-run false
```

#### [NEW] [backend/src/scripts/replay.js](file:///d:/dlq/backend/src/scripts/replay.js)
- CLI interface for replay
- Query DLQ with filters
- Validate system health
- Batch processing
- Progress reporting

**Validation**:
- Replay single message via API
- Replay batch via shell script
- Test dry-run mode
- Verify status updates

---

### Phase 7: Frontend Dashboard (Day 9-11)

**Goal**: Build React.js admin dashboard

#### [NEW] [frontend/src/App.jsx](file:///d:/dlq/frontend/src/App.jsx)
- React Router setup
- Layout with navigation
- Route definitions

#### [NEW] [frontend/src/pages/Dashboard.jsx](file:///d:/dlq/frontend/src/pages/Dashboard.jsx)
- System metrics overview cards:
  - Total messages processed
  - Failed messages
  - DLQ size
  - Circuit breaker status
- Real-time updates (polling every 5s)

#### [NEW] [frontend/src/pages/DLQMessages.jsx](file:///d:/dlq/frontend/src/pages/DLQMessages.jsx)
- Table view of DLQ messages
- Columns: ID, Error Type, Retry Count, Status, Created At, Actions
- Filters: Status, Error Type, Date Range
- Pagination controls
- Replay action buttons

#### [NEW] [frontend/src/components/MessageDetail.jsx](file:///d:/dlq/frontend/src/components/MessageDetail.jsx)
- Modal/drawer for message details
- Display full payload, error stack, metadata
- Replay history timeline
- Replay button

#### [NEW] [frontend/src/components/CircuitBreakerStatus.jsx](file:///d:/dlq/frontend/src/components/CircuitBreakerStatus.jsx)
- Visual indicator (green/yellow/red)
- State: CLOSED, OPEN, HALF_OPEN
- Failure rate display
- Manual reset button (admin only)

#### [NEW] [frontend/src/services/api.js](file:///d:/dlq/frontend/src/services/api.js)
- Axios client configuration
- API methods for all endpoints
- Error handling
- Request/response interceptors

**Styling**:
- Tailwind CSS for all components
- Responsive design
- Dark mode support (optional)
- Loading states and error messages

**Validation**:
- Test all UI interactions
- Verify real-time updates
- Test replay actions
- Check responsive design

---

### Phase 8: Monitoring & Observability (Day 12)

**Goal**: Add comprehensive monitoring

#### [NEW] [backend/src/utils/metrics.js](file:///d:/dlq/backend/src/utils/metrics.js)
- Prometheus-compatible metrics
- Counters: messages_processed, dlq_messages_total
- Gauges: queue_depth, dlq_backlog, circuit_breaker_state
- Histograms: processing_duration

#### [MODIFY] [backend/src/api/server.js](file:///d:/dlq/backend/src/api/server.js)
- Add `/metrics` endpoint for Prometheus scraping

#### [NEW] [backend/src/utils/alerting.js](file:///d:/dlq/backend/src/utils/alerting.js)
- Alert rule definitions
- Integration points (Slack, email, PagerDuty)
- Alert throttling

**Validation**:
- Access `/metrics` endpoint
- Verify metric values
- Test alert triggers

---

### Phase 9: Testing & Validation (Day 13-14)

**Goal**: Comprehensive testing

#### Unit Tests
- Retry manager logic
- Circuit breaker state transitions
- DLQ routing logic
- Replay service

#### Integration Tests
- API endpoint tests
- End-to-end message flow
- DLQ worker behavior
- Circuit breaker integration

#### Load Tests
- High message throughput (1000+ msgs/sec)
- Concurrent replay operations
- Circuit breaker under load

**Test Files**:
- `backend/tests/unit/*.test.js`
- `backend/tests/integration/*.test.js`
- `backend/tests/load/load-test.js`

---

### Phase 10: Documentation & Deployment (Day 15)

**Goal**: Production-ready deployment

#### [MODIFY] [README.md](file:///d:/dlq/README.md)
- Project overview
- Architecture diagram
- Setup instructions
- Usage examples

#### [NEW] [docs/API.md](file:///d:/dlq/docs/API.md)
- Complete API documentation
- Request/response examples
- Error codes

#### [NEW] [docker/docker-compose.yml](file:///d:/dlq/docker/docker-compose.yml)
- Services: backend, worker, frontend, MongoDB, Redis
- Volume mounts
- Environment variables
- Health checks

#### [NEW] [.env.example](file:///d:/dlq/.env.example)
- All required environment variables
- Default values
- Comments explaining each variable

---

## Verification Plan

### Automated Tests
- Run unit tests: `npm test`
- Run integration tests: `npm run test:integration`
- Run load tests: `npm run test:load`

### Manual Verification
1. **Message Processing**
   - Submit 100 messages via API
   - Verify successful processing
   - Check queue metrics

2. **Retry Mechanism**
   - Force failures
   - Verify exponential backoff (1s, 2s, 4s)
   - Confirm max retry limit

3. **DLQ Routing**
   - Exceed retry limit
   - Verify DLQ persistence
   - Check metadata completeness

4. **Circuit Breaker**
   - Simulate 60% failure rate
   - Verify circuit opens
   - Confirm 503 responses
   - Test auto-recovery

5. **DLQ Worker**
   - Verify polling behavior
   - Test retry strategies
   - Check distributed locking

6. **Replay**
   - Replay single message
   - Replay batch (50 messages)
   - Verify status updates

7. **Frontend**
   - View dashboard metrics
   - Filter DLQ messages
   - Trigger replay actions
   - Monitor circuit breaker

---

## Configuration Files

### [NEW] [config/retry-policies.json](file:///d:/dlq/config/retry-policies.json)
```json
{
  "maxRetries": 3,
  "baseBackoffMs": 1000,
  "maxBackoffMs": 30000,
  "jitterPercent": 20,
  "dlqRetries": {
    "immediate": [1, 5, 15, 30, 60],
    "scheduled": [2, 3, 4],
    "maxAttempts": 5
  }
}
```

### [NEW] [config/circuit-breaker.json](file:///d:/dlq/config/circuit-breaker.json)
```json
{
  "failureThreshold": 0.5,
  "timeWindowMs": 60000,
  "minimumRequests": 10,
  "openTimeoutMs": 30000,
  "halfOpenMaxRequests": 10,
  "halfOpenSuccessThreshold": 0.8
}
```

---

## Success Criteria

- ✅ Zero message loss (99.99% durability)
- ✅ Controlled retry behavior (exponential backoff working)
- ✅ DLQ messages properly persisted with metadata
- ✅ Circuit breaker trips at 50% failure rate
- ✅ Replay mechanism successfully recovers messages
- ✅ Frontend dashboard displays real-time data
- ✅ All tests passing
- ✅ System handles 1000+ msgs/sec
- ✅ Complete documentation

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Setup | 1 day | Project structure, dependencies |
| 2. Backend Core | 2 days | Message processing, retry logic |
| 3. DLQ System | 2 days | DLQ routing, worker, persistence |
| 4. Circuit Breaker | 1 day | Circuit breaker implementation |
| 5. APIs | 1 day | DLQ management endpoints |
| 6. Replay | 1 day | Replay service and scripts |
| 7. Frontend | 3 days | React dashboard |
| 8. Monitoring | 1 day | Metrics and alerting |
| 9. Testing | 2 days | Unit, integration, load tests |
| 10. Deployment | 1 day | Docker, documentation |
| **Total** | **15 days** | **Production-ready system** |
