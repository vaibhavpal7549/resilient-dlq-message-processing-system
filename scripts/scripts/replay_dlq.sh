#!/bin/bash

DLQ_FILE="dlq.txt"

# Allow an optional DLQ file path as the first argument.
if [ -n "$1" ]; then
  DLQ_FILE="$1"
fi

if [ ! -f "$DLQ_FILE" ]; then
  echo "DLQ file not found at: $DLQ_FILE"
  echo "Usage: $0 [DLQ_FILE_PATH]  # default: dlq.txt"
  exit 1
fi

echo "Starting DLQ replay..."

while IFS= read -r message
do
  echo "Replaying: $message"
done < "$DLQ_FILE"

echo "Done!"
