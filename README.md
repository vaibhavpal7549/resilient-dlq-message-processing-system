# DLQ Message Processing System

A production-grade Dead Letter Queue (DLQ) message processing system with circuit breaker protection, retry mechanisms, and comprehensive observability.

## Features

- ✅ Message ingestion via REST API
- ✅ Automatic retry with exponential backoff
- ✅ Dead Letter Queue for failed messages
- ✅ Circuit breaker pattern for system protection
- ✅ MongoDB persistence with rich metadata
- ✅ Redis-based message queue
- ✅ Comprehensive logging and monitoring
- ✅ Admin dashboard (React.js)

## Architecture

```
Client → API Gateway → Circuit Breaker → Message Queue → Primary Processor
                                              ↓
                                         Retry Manager
                                              ↓
                                         DLQ Router → MongoDB
                                              ↓
                                         DLQ Worker → Replay
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd dlq
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB and Redis
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0
docker run -d -p 6379:6379 --name redis redis:7.0
```

5. Start the backend server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Submit Message
```bash
POST /api/messages
Content-Type: application/json

{
  "payload": {
    "data": "your message data"
  },
  "source": "api",
  "priority": 1
}
```

### Health Check
```bash
GET /api/system/health
```

## Configuration

Configuration files are located in the `config/` directory:

- `retry-policies.json` - Retry limits and backoff settings
- `circuit-breaker.json` - Circuit breaker thresholds

## Project Structure

```
dlq/
├── backend/          # Express.js API server
├── worker/           # DLQ worker service
├── frontend/         # React.js dashboard
├── scripts/          # Automation scripts
├── config/           # Configuration files
└── docs/             # Documentation
```

## Development

```bash
# Run backend in development mode
cd backend
npm run dev

# Run tests
npm test

# Run load tests
npm run test:load
```

## Documentation

- [PRD](prd.md) - Product Requirements Document
- [Implementation Plan](docs/implementation_plan.md) - Detailed implementation guide
- [API Documentation](docs/API.md) - Complete API reference

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.
