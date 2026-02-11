#!/bin/bash

# DLQ Replay Script
# Usage: ./replay-dlq.sh --error-type TIMEOUT_ERROR --start-date 2026-02-10T00:00:00Z --batch-size 100

# Default values
ERROR_TYPE=""
START_DATE=""
END_DATE=""
SOURCE=""
BATCH_SIZE=100
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --error-type)
      ERROR_TYPE="$2"
      shift 2
      ;;
    --start-date)
      START_DATE="$2"
      shift 2
      ;;
    --end-date)
      END_DATE="$2"
      shift 2
      ;;
    --source)
      SOURCE="$2"
      shift 2
      ;;
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Build JSON payload
FILTERS="{"
if [ -n "$ERROR_TYPE" ]; then
  FILTERS="$FILTERS\"errorType\":\"$ERROR_TYPE\","
fi
if [ -n "$START_DATE" ]; then
  FILTERS="$FILTERS\"startDate\":\"$START_DATE\","
fi
if [ -n "$END_DATE" ]; then
  FILTERS="$FILTERS\"endDate\":\"$END_DATE\","
fi
if [ -n "$SOURCE" ]; then
  FILTERS="$FILTERS\"source\":\"$SOURCE\","
fi
FILTERS="${FILTERS%,}}"

PAYLOAD="{\"filters\":$FILTERS,\"batchSize\":$BATCH_SIZE,\"dryRun\":$DRY_RUN}"

echo "Replaying DLQ messages..."
echo "Payload: $PAYLOAD"

# Call API
curl -X POST http://localhost:3000/api/dlq/replay-batch \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  | jq '.'

echo ""
echo "Replay complete!"
