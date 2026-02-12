# DLQ Worker Service

A production-ready Node.js Dead Letter Queue (DLQ) worker service that processes failed messages from MongoDB with intelligent retry strategies and failure categorization.

## Features

- ✅ **Automatic Message Processing** - Polls MongoDB for failed messages
- ✅ **Intelligent Retry Strategies** - Immediate, scheduled, and exponential backoff
- ✅ **Failure Categorization** - TEMPORARY vs PERMANENT error classification
- ✅ **Configurable Retry Limits** - Prevent infinite retry loops
- ✅ **Lock Management** - Distributed processing with stale lock cleanup
- ✅ **Comprehensive Logging** - Winston-based structured logging
- ✅ **Graceful Shutdown** - Clean process termination
- ✅ **Statistics Tracking** - Monitor worker performance

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DLQ Worker Service                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────────────┐        │
│  │   MongoDB    │◄─────┤ Worker Orchestrator  │        │
│  │  DLQ Store   │      │   (Polling Loop)     │        │
│  └──────────────┘      └──────────────────────┘        │
│         ▲                        │                       │
│         │                        ▼                       │
│         │              ┌──────────────────────┐         │
│         │              │  Message Processor   │         │
│         │              └──────────────────────┘         │
│         │                        │                       │
│         │                        ▼                       │
│         │              ┌──────────────────────┐         │
│         └──────────────┤ Failure Classifier   │         │
│                        └──────────────────────┘         │
│                                 │                        │
│                                 ▼                        │
│                        ┌──────────────────────┐         │
│                        │  Retry Strategy      │         │
│                        │  - Immediate         │         │
│                        │  - Scheduled         │         │
│                        │  - Manual            │         │
│                        │  - Failed            │         │
│                        └──────────────────────┘         │
│                                 │                        │
│                                 ▼                        │
│                        ┌──────────────────────┐         │
│                        │   Redis Queue        │         │
│                        │  (Re-injection)      │         │
│                        └──────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Installation

1. **Install dependencies**
   ```bash
   cd worker
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Ensure MongoDB and Redis are running**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:6.0
   docker run -d -p 6379:6379 --name redis redis:7.0
   ```

## Usage

### Start Worker (Development)
```bash
npm run dev
```

### Start Worker (Production)
```bash
npm start
```

## Configuration

All configuration is managed through environment variables. See `.env.example` for available options.

### Key Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DLQ_POLL_INTERVAL_MS` | 30000 | How often to poll for messages (ms) |
| `DLQ_BATCH_SIZE` | 10 | Number of messages per batch |
| `DLQ_MAX_RETRIES` | 5 | Maximum retry attempts |
| `DLQ_LOCK_TIMEOUT_MS` | 300000 | Stale lock timeout (ms) |
| `DLQ_OFF_PEAK_HOUR` | 2 | Off-peak retry hour (0-23) |

## Error Classification

The worker automatically categorizes errors into three types:

### TEMPORARY Errors (Auto-Retry)
- `TIMEOUT_ERROR`
- `CONNECTION_ERROR`
- `RATE_LIMIT_ERROR`
- `SERVICE_UNAVAILABLE`
- `NETWORK_ERROR`

### PERMANENT Errors (Mark as Failed)
- `VALIDATION_ERROR`
- `AUTHORIZATION_ERROR`
- `NOT_FOUND_ERROR`
- `BUSINESS_LOGIC_ERROR`
- `SCHEMA_ERROR`

### MANUAL Errors (Require Intervention)
- `UNKNOWN_ERROR`
- `UNHANDLED_ERROR`

## Retry Strategies

### 1. Immediate Retry
- Used for temporary errors
- Exponential backoff: 1min, 5min, 15min, 30min, 60min
- Automatically re-injects to processing queue

### 2. Scheduled Retry
- Schedules retry during off-peak hours
- Reduces load during peak times

### 3. Manual Intervention
- Flags unknown errors for human review
- Prevents automatic processing

### 4. Mark as Failed
- Permanently failed after max retries
- No further automatic processing

## Project Structure

```
worker/
├── src/
│   ├── config/
│   │   └── index.js              # Configuration management
│   ├── db/
│   │   ├── connection.js         # MongoDB connection
│   │   └── models/
│   │       └── DLQMessage.js     # DLQ message schema
│   ├── services/
│   │   ├── failureClassifier.js  # Error categorization
│   │   ├── retryStrategy.js      # Retry implementations
│   │   ├── messageProcessor.js   # Message processing
│   │   └── workerOrchestrator.js # Main orchestration
│   ├── utils/
│   │   ├── logger.js             # Winston logger
│   │   └── helpers.js            # Utility functions
│   └── index.js                  # Main entry point
├── logs/                         # Log files
├── .env.example                  # Environment template
├── package.json
└── README.md
```

## Logging

The worker uses Winston for structured logging with multiple transports:

- **Console** - Human-readable format for development
- **File** - JSON format for production (`logs/dlq-worker.log`)
- **Error File** - Error-only logs (`logs/error.log`)

### Log Levels
- `error` - Errors and failures
- `warn` - Warnings and important events
- `info` - General information (default)
- `debug` - Detailed debugging information

## Graceful Shutdown

The worker handles shutdown signals gracefully:

```bash
# Send SIGTERM or SIGINT
kill -SIGTERM <pid>
# or
Ctrl+C
```

On shutdown, the worker will:
1. Stop accepting new messages
2. Complete current processing
3. Close queue connections
4. Disconnect from MongoDB
5. Log final statistics

## Monitoring

The worker tracks and logs statistics:

- Total messages processed
- Success/failure counts
- Success rate percentage
- Worker uptime
- Processing times

## License

MIT
