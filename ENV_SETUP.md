# Environment Configuration Guide

This guide explains how to configure the `.env` files for running the DLQ system locally or in production.

## Quick Setup (Local Development)

### 1. Backend Environment (.env)

Create `d:\dlq\.env` (already exists, just verify/update):

```bash
# Environment
NODE_ENV=development

# Backend API
PORT=3000

# MongoDB - Local
MONGODB_URI=mongodb://localhost:27017/dlq_system
MONGODB_POOL_SIZE=10

# Redis - Local
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=info
```

**That's it for local development!** The backend and worker will both use this `.env` file.

### 2. Frontend Environment (Optional)

Create `d:\dlq\frontend\.env`:

```bash
VITE_API_URL=http://localhost:3000
```

**Note:** This is optional. If not set, the frontend defaults to `http://localhost:3000`.

## Step-by-Step Setup

### Option 1: Using Docker (Recommended - No Manual Configuration Needed!)

If you use Docker Compose, **you don't need to configure anything**. Just run:

```bash
docker-compose -f docker/docker-compose.yml up -d
```

Docker Compose automatically:
- Starts MongoDB on port 27017
- Starts Redis on port 6379
- Configures all services to connect to each other
- Sets up networking between containers

### Option 2: Manual Setup (Requires MongoDB & Redis)

#### Step 1: Start MongoDB

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name dlq-mongodb mongo:6.0
```

**Or install MongoDB locally:**
- Download from: https://www.mongodb.com/try/download/community
- Default connection: `mongodb://localhost:27017`

#### Step 2: Start Redis

**Using Docker:**
```bash
docker run -d -p 6379:6379 --name dlq-redis redis:7.0-alpine
```

**Or install Redis locally (Windows):**
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL2 with Redis

**Or use Redis Cloud (Free tier):**
1. Sign up at: https://redis.com/try-free/
2. Get connection details
3. Update `.env`:
```bash
REDIS_HOST=your-redis-host.redis.cloud
REDIS_PORT=12345
REDIS_PASSWORD=your-password
```

#### Step 3: Verify .env File

Your `d:\dlq\.env` should look like:

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/dlq_system
MONGODB_POOL_SIZE=10
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
LOG_LEVEL=info
```

#### Step 4: Start the Services

**Terminal 1 - Backend:**
```bash
cd d:\dlq\backend
npm run dev
```

**Terminal 2 - Worker:**
```bash
cd d:\dlq\worker
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd d:\dlq\frontend
npm run dev
```

## Production Configuration

For production, create `d:\dlq\.env.production`:

```bash
# Environment
NODE_ENV=production

# Backend API
PORT=3000

# MongoDB - Production (use MongoDB Atlas or your hosted instance)
#MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dlq_system?retryWrites=true&w=majority
MONGODB_URI=url
MONGODB_POOL_SIZE=20

# Redis - Production (use Redis Cloud or your hosted instance)
REDIS_HOST=your-production-redis.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0

# Circuit Breaker (production tuning)
CB_FAILURE_THRESHOLD=0.5
CB_TIME_WINDOW_MS=60000
CB_OPEN_TIMEOUT_MS=30000

# Retry Configuration
MAX_RETRIES=3
BASE_BACKOFF_MS=1000
MAX_BACKOFF_MS=30000

# DLQ Worker
DLQ_POLL_INTERVAL_MS=30000
DLQ_BATCH_SIZE=10
DLQ_MAX_RETRIES=5

# Logging
LOG_LEVEL=warn
LOG_FILE=logs/app.log

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Verification Checklist

After configuration, verify everything works:

### 1. Check MongoDB Connection
```bash
# Using mongosh (if installed)
mongosh mongodb://localhost:27017/dlq_system

# Or using Docker
docker exec -it dlq-mongodb mongosh dlq_system
```

### 2. Check Redis Connection
```bash
# Using redis-cli (if installed)
redis-cli ping
# Should return: PONG

# Or using Docker
docker exec -it dlq-redis redis-cli ping
```

### 3. Check Backend Health
```bash
curl http://localhost:3000/api/system/health
```

Should return:
```json
{
  "success": true,
  "healthy": true,
  "components": {
    "mongodb": { "healthy": true },
    "redis": { "healthy": true },
    ...
  }
}
```

### 4. Access Frontend
Open browser to: http://localhost:5173

You should see the DLQ Management Dashboard.

## Common Issues & Solutions

### Issue 1: "Cannot connect to MongoDB"

**Solution:**
1. Verify MongoDB is running:
   ```bash
   docker ps | grep mongodb
   # OR
   netstat -an | findstr 27017
   ```

2. Check connection string in `.env`:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/dlq_system
   ```

3. Test connection:
   ```bash
   mongosh mongodb://localhost:27017/dlq_system
   ```

### Issue 2: "Cannot connect to Redis"

**Solution:**
1. Verify Redis is running:
   ```bash
   docker ps | grep redis
   # OR
   netstat -an | findstr 6379
   ```

2. Check connection in `.env`:
   ```bash
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. Test connection:
   ```bash
   redis-cli ping
   ```

### Issue 3: "Frontend can't connect to backend"

**Solution:**
1. Verify backend is running on port 3000
2. Check CORS is enabled (already configured)
3. Update frontend `.env` if needed:
   ```bash
   VITE_API_URL=http://localhost:3000
   ```

### Issue 4: "Worker not processing messages"

**Solution:**
1. Check worker logs for errors
2. Verify MongoDB and Redis connections
3. Check DLQ messages exist:
   ```bash
   curl http://localhost:3000/api/dlq
   ```

## Environment Variables Reference

### Required Variables
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | development | production |
| `PORT` | Backend API port | 3000 | 3000 |
| `MONGODB_URI` | MongoDB connection string | - | mongodb://localhost:27017/dlq_system |
| `REDIS_HOST` | Redis hostname | localhost | localhost |
| `REDIS_PORT` | Redis port | 6379 | 6379 |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_POOL_SIZE` | MongoDB connection pool size | 10 |
| `REDIS_PASSWORD` | Redis password | (empty) |
| `REDIS_DB` | Redis database number | 0 |
| `LOG_LEVEL` | Logging level | info |
| `DLQ_POLL_INTERVAL_MS` | Worker polling interval | 30000 |
| `DLQ_BATCH_SIZE` | Worker batch size | 10 |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | 100 |

## Next Steps

Once configured, proceed to test the system:
1. Submit test messages
2. Simulate failures
3. View DLQ messages in dashboard
4. Test replay functionality

See [QUICKSTART.md](file:///d:/dlq/QUICKSTART.md) for testing instructions.
