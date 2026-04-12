#!/bin/bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
MODE="mongo"
ERROR_TYPE=""
SOURCE=""
START_DATE=""
END_DATE=""
BATCH_SIZE=25
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --error-type)
      ERROR_TYPE="$2"
      shift 2
      ;;
    --source)
      SOURCE="$2"
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

if [[ "$MODE" == "spool" ]]; then
  PAYLOAD="{\"batchSize\":$BATCH_SIZE}"
  ENDPOINT="$API_BASE_URL/api/dlq/spool/replay"
else
  FILTERS="{"
  if [[ -n "$ERROR_TYPE" ]]; then
    FILTERS="$FILTERS\"errorType\":\"$ERROR_TYPE\","
  fi
  if [[ -n "$SOURCE" ]]; then
    FILTERS="$FILTERS\"source\":\"$SOURCE\","
  fi
  if [[ -n "$START_DATE" ]]; then
    FILTERS="$FILTERS\"startDate\":\"$START_DATE\","
  fi
  if [[ -n "$END_DATE" ]]; then
    FILTERS="$FILTERS\"endDate\":\"$END_DATE\","
  fi
  FILTERS="${FILTERS%,}}"
  PAYLOAD="{\"filters\":$FILTERS,\"batchSize\":$BATCH_SIZE,\"dryRun\":$DRY_RUN}"
  ENDPOINT="$API_BASE_URL/api/dlq/replay-batch"
fi

echo "Calling $ENDPOINT"
echo "Payload: $PAYLOAD"

curl -sS -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo
