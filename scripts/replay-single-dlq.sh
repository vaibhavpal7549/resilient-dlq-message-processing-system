#!/bin/bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/replay-single-dlq.sh <mongoId>"
  exit 1
fi

node scripts/dlq-cli.js replay-one "$1"
