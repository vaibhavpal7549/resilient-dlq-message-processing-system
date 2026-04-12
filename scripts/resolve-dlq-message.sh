#!/bin/bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/resolve-dlq-message.sh <mongoId> [resolvedBy] [notes...]"
  exit 1
fi

ID="$1"
RESOLVED_BY="${2:-dlq-cli}"

if [[ $# -ge 3 ]]; then
  shift 2
  NOTES="$*"
  node scripts/dlq-cli.js resolve "$ID" "$RESOLVED_BY" "$NOTES"
else
  node scripts/dlq-cli.js resolve "$ID" "$RESOLVED_BY"
fi
