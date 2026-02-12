# DLQ Worker Service - Quick Reference

## 📁 Project Structure

```
worker/
├── src/
│   ├── config/
│   │   └── index.js              # ⚙️  Configuration management
│   ├── db/
│   │   ├── connection.js         # 🔌 MongoDB connection
│   │   └── models/
│   │       └── DLQMessage.js     # 📄 DLQ message schema
│   ├── services/
│   │   ├── failureClassifier.js  # 🏷️  Error categorization
│   │   ├── retryStrategy.js      # 🔄 Retry implementations
│   │   ├── messageProcessor.js   # ⚡ Message processing
│   │   └── workerOrchestrator.js # 🎯 Main orchestration
│   ├── utils/
│   │   ├── logger.js             # 📝 Winston logger
│   │   └── helpers.js            # 🛠️  Utility functions
│   └── index.js                  # 🚀 Main entry point
├── .env.example                  # 📋 Environment template
├── package.json
└── README.md
```

## 🔑 Key Features

| Feature | Description |
|---------|-------------|
| **Failure Categorization** | TEMPORARY, PERMANENT, MANUAL |
| **Retry Strategies** | Immediate, Scheduled, Manual, Failed |
| **Exponential Backoff** | 1min → 5min → 15min → 30min → 60min |
| **Lock Management** | Distributed processing with stale lock cleanup |
| **Logging** | Winston with console + file transports |
| **Graceful Shutdown** | SIGTERM/SIGINT handling |

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd worker
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB and Redis URLs

# 3. Start worker
npm run dev    # Development mode
npm start      # Production mode
```

## 📊 Error Classification

### TEMPORARY (Auto-Retry)
- `TIMEOUT_ERROR`
- `CONNECTION_ERROR`
- `RATE_LIMIT_ERROR`
- `SERVICE_UNAVAILABLE`

### PERMANENT (Mark as Failed)
- `VALIDATION_ERROR`
- `AUTHORIZATION_ERROR`
- `NOT_FOUND_ERROR`
- `BUSINESS_LOGIC_ERROR`

### MANUAL (Human Review)
- `UNKNOWN_ERROR`
- `UNHANDLED_ERROR`

## 🔄 Retry Flow

```
DLQ Message
    ↓
Classify Error Type
    ↓
┌───────────────┬────────────────┬──────────────┐
│   TEMPORARY   │   PERMANENT    │    MANUAL    │
│               │                │              │
│ Immediate     │ Mark as        │ Flag for     │
│ Retry         │ Failed         │ Review       │
│               │                │              │
│ Backoff:      │ Status:        │ Status:      │
│ 1→5→15→30→60  │ dlq_failed     │ dlq_manual   │
└───────────────┴────────────────┴──────────────┘
```

## ⚙️ Configuration

```bash
# Worker Settings
DLQ_POLL_INTERVAL_MS=30000    # Poll every 30 seconds
DLQ_BATCH_SIZE=10             # Process 10 messages per batch
DLQ_MAX_RETRIES=5             # Maximum retry attempts
DLQ_LOCK_TIMEOUT_MS=300000    # 5 minutes lock timeout

# Logging
LOG_LEVEL=info                # error, warn, info, debug
LOG_FILE=logs/dlq-worker.log
```

## 📝 Example Log Output

```
2026-02-12 14:00:00 info: DLQ Worker Service Starting
2026-02-12 14:00:00 info: MongoDB connected
2026-02-12 14:00:00 info: Starting worker polling loop
2026-02-12 14:00:30 info: Found pending DLQ messages { count: 3 }
2026-02-12 14:00:30 info: Processing DLQ message { messageId: 'msg_123' }
2026-02-12 14:00:30 info: Executing immediate retry
2026-02-12 14:00:30 info: Message processed successfully
```

## 📈 Statistics

Worker tracks:
- Total messages processed
- Success/failure counts
- Success rate percentage
- Worker uptime
- Processing times

## 🛑 Graceful Shutdown

```bash
# Send SIGTERM or press Ctrl+C
kill -SIGTERM <pid>

# Worker will:
# 1. Stop accepting new messages
# 2. Complete current processing
# 3. Close connections
# 4. Log final statistics
```

## 📚 Documentation

- [README.md](file:///Users/vaibhavsingh/Desktop/resilient-dlq-message-processing-system/worker/README.md) - Full documentation
- [Implementation Plan](file:///Users/vaibhavsingh/.gemini/antigravity/brain/3c962059-778d-4205-8776-541be0e49d75/implementation_plan.md) - Technical plan
- [Walkthrough](file:///Users/vaibhavsingh/.gemini/antigravity/brain/3c962059-778d-4205-8776-541be0e49d75/walkthrough.md) - Detailed implementation guide
