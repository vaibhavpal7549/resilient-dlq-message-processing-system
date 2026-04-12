#!/bin/bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
WAIT_SECONDS="${WAIT_SECONDS:-8}"

post_message() {
  local body="$1"
  curl -sS -X POST "$API_BASE_URL/api/messages" \
    -H "Content-Type: application/json" \
    -d "$body"
  echo
}

echo "Submitting demo messages to $API_BASE_URL/api/messages"

post_message '{"payload":{"simulateError":true,"errorType":"VALIDATION_ERROR","orderId":"ORD-DEMO-1001"},"source":"demo-script","priority":1,"tags":["demo","validation"]}'
post_message '{"payload":{"simulateError":true,"errorType":"VALIDATION_ERROR","orderId":"ORD-DEMO-1002"},"source":"demo-script","priority":2,"tags":["demo","validation"]}'
post_message '{"payload":{"simulateError":true,"errorType":"TIMEOUT_ERROR","orderId":"ORD-DEMO-1003"},"source":"demo-script","priority":2,"tags":["demo","transient"]}'

echo "Waiting $WAIT_SECONDS seconds for queue processing..."
sleep "$WAIT_SECONDS"

echo
echo "DLQ stats:"
curl -sS "$API_BASE_URL/api/dlq/stats"
echo
echo
echo "Recent demo DLQ records:"
curl -sS "$API_BASE_URL/api/dlq?source=demo-script&limit=10&sortOrder=desc"
echo
