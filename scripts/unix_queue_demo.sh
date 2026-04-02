#!/bin/bash

# Simple Unix Message Queue Demo
# Ye script file-based queue simulate karta hai

QUEUE_FILE="queue.txt"

echo "📥 Adding messages to queue..."

# Add messages
echo "order_101" >> $QUEUE_FILE
echo "payment_202" >> $QUEUE_FILE
echo "email_303" >> $QUEUE_FILE

echo "📤 Processing queue..."

# Process messages
while read -r message
do
  echo "Processing: $message"
  sleep 1
done < $QUEUE_FILE

echo "✅ Queue processing completed!"
