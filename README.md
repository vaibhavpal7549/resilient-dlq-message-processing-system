# Resilient Message Processing System with DLQ

## Overview
This project implements a fault-tolerant message processing system inspired by
AWS SQS Dead Letter Queue and RabbitMQ Dead Letter Exchange.

## Key Features
- Retry mechanism with failure threshold
- Dead Letter Queue with persistent storage
- Node.js DLQ worker for retries and debugging
- Circuit breaker for overload protection
- Shell-based replay mechanism
- MongoDB-backed DLQ persistence

## Tech Stack
- Node.js, Express
- MongoDB
- Unix/Linux Shell
- Git

## Architecture
Refer to /docs/architecture-diagrams

## How to Run
1. Clone repository
2. Install dependencies
3. Configure environment variables
4. Start API service
5. Start worker service

## Inspired By
- AWS SQS Dead Letter Queue
- RabbitMQ Dead Letter Exchange
