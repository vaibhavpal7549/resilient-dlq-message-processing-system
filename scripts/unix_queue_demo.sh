#!/bin/bash

set -euo pipefail

SPOOL_DIR="${DLQ_SPOOL_DIR:-./scripts/unix-dlq-spool}"
mkdir -p "$SPOOL_DIR"

echo "Creating sample unix-style DLQ spool entries in $SPOOL_DIR"

cat > "$SPOOL_DIR/demo-timeout.json" <<'JSON'
{
  "messageId": "demo-timeout",
  "originalMessage": {
    "orderId": "ORD-1001",
    "simulateError": true,
    "errorType": "TIMEOUT_ERROR"
  },
  "errorReason": "Timed out writing to downstream service",
  "errorType": "TIMEOUT_ERROR",
  "retryCount": 3,
  "dlqRetryCount": 0,
  "status": "dlq_pending",
  "metadata": {
    "source": "unix-demo",
    "priority": 1,
    "tags": ["demo", "spool"],
    "overflowedToUnixSpool": true
  }
}
JSON

ls -1 "$SPOOL_DIR"
