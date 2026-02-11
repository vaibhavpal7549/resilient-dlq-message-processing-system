# Quick Start Guide

## Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Worker Dependencies

```bash
cd ../worker
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Running Locally

### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop all services
docker-compose -f docker/docker-compose.yml down
```

### Option 2: Manual Setup

**Terminal 1 - Start MongoDB:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

**Terminal 2 - Start Redis:**
```bash
docker run -d -p 6379:6379 --name redis redis:7.0-alpine
```

**Terminal 3 - Start Backend:**
```bash
cd backend
npm run dev
```

**Terminal 4 - Start Worker:**
```bash
cd worker
npm run dev
```

**Terminal 5 - Start Frontend:**
```bash
cd frontend
npm run dev
```

## Testing the System

### 1. Submit a Test Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "data": "test message"
    }
  }'
```

### 2. Submit a Message That Will Fail

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "simulateError": true,
      "errorType": "TIMEOUT_ERROR"
    }
  }'
```

### 3. Check System Health

```bash
curl http://localhost:3000/api/system/health | jq
```

### 4. View DLQ Messages

```bash
curl http://localhost:3000/api/dlq | jq
```

### 5. Replay a DLQ Message

```bash
# Get a DLQ message ID first
DLQ_ID=$(curl -s http://localhost:3000/api/dlq | jq -r '.data[0]._id')

# Replay it
curl -X POST http://localhost:3000/api/dlq/$DLQ_ID/replay
```

### 6. Access the Dashboard

Open your browser to: http://localhost:5173

## Replay Scripts

### PowerShell (Windows):

```powershell
.\scripts\replay-dlq.ps1 -ErrorType "TIMEOUT_ERROR" -BatchSize 50 -DryRun
```

### Bash (Linux/Mac):

```bash
chmod +x scripts/replay-dlq.sh
./scripts/replay-dlq.sh --error-type TIMEOUT_ERROR --batch-size 50 --dry-run
```

## Monitoring

- **Backend API**: http://localhost:3000
- **Frontend Dashboard**: http://localhost:5173
- **Health Check**: http://localhost:3000/api/system/health

## Troubleshooting

### Backend won't start
- Check MongoDB is running: `docker ps | grep mongodb`
- Check Redis is running: `docker ps | grep redis`
- Check logs: `cd backend && npm run dev`

### Worker not processing messages
- Check worker logs
- Verify MongoDB connection
- Check DLQ table for pending messages

### Frontend can't connect to backend
- Verify backend is running on port 3000
- Check CORS settings
- Update `VITE_API_URL` in frontend/.env if needed


