# Quick Demo Setup Guide

Since Docker isn't running and MongoDB/Redis aren't installed locally, here are your **3 easiest options** to run the demo:

## Option 1: Start Docker Desktop (Recommended - 2 minutes)

1. **Start Docker Desktop** on your Windows machine
2. Wait for it to fully start (check system tray icon)
3. Then run these commands:

```bash
# Start MongoDB and Redis
docker run -d -p 27017:27017 --name dlq-mongodb mongo:6.0
docker run -d -p 6379:6379 --name dlq-redis redis:7.0-alpine

# Start backend
cd d:\dlq\backend
npm run dev

# In another terminal, start frontend
cd d:\dlq\frontend
npm run dev
```

4. Open browser to: **http://localhost:5173**

---

## Option 2: Use Free Cloud Services (5 minutes)

### Step 1: Setup MongoDB Atlas (Free)
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create free account
3. Create a free cluster (M0)
4. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

### Step 2: Setup Redis Cloud (Free)
1. Go to: https://redis.com/try-free/
2. Create free account
3. Create free database
4. Get connection details (host, port, password)

### Step 3: Update .env file

Edit `d:\dlq\.env`:

```bash
NODE_ENV=development
PORT=3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dlq_system?retryWrites=true&w=majority
MONGODB_POOL_SIZE=10

# Redis Cloud
REDIS_HOST=redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

LOG_LEVEL=info
```

### Step 4: Start the services

```bash
# Terminal 1 - Backend
cd d:\dlq\backend
npm run dev

# Terminal 2 - Frontend
cd d:\dlq\frontend
npm run dev
```

### Step 5: Open browser
Go to: **http://localhost:5173**

---

## Option 3: Install MongoDB & Redis Locally (10 minutes)

### Install MongoDB Community Edition
1. Download: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will run on `localhost:27017`

### Install Redis (Windows)
**Option A - Using WSL2 (Recommended):**
```bash
# In WSL2 terminal
sudo apt update
sudo apt install redis-server
redis-server
```

**Option B - Using Memurai (Redis for Windows):**
1. Download: https://www.memurai.com/get-memurai
2. Install and start service
3. Runs on `localhost:6379`

### Start the services
```bash
# Terminal 1 - Backend
cd d:\dlq\backend
npm run dev

# Terminal 2 - Frontend  
cd d:\dlq\frontend
npm run dev
```

### Open browser
Go to: **http://localhost:5173**

---

## What You'll See in the Demo

Once running, you'll see:

1. **Dashboard Page** - Real-time metrics showing:
   - Circuit Breaker status (CLOSED/OPEN/HALF_OPEN)
   - Queue depth
   - DLQ pending/resolved counts
   - Top error types

2. **DLQ Messages Page** - Table showing:
   - Failed messages with error details
   - Filtering by status, error type, source
   - Replay buttons for individual messages
   - Batch replay functionality

## Test the System

Once running, test it with:

```bash
# Submit a normal message
curl -X POST http://localhost:3000/api/messages -H "Content-Type: application/json" -d "{\"payload\":{\"data\":\"test\"}}"

# Submit a message that will fail
curl -X POST http://localhost:3000/api/messages -H "Content-Type: application/json" -d "{\"payload\":{\"simulateError\":true,\"errorType\":\"TIMEOUT_ERROR\"}}"

# Check health
curl http://localhost:3000/api/system/health
```

Then refresh the dashboard to see the metrics update!

---

## Which Option Should You Choose?

- **Have Docker Desktop?** → Use **Option 1** (fastest)
- **Don't want to install anything?** → Use **Option 2** (cloud services)
- **Want everything local?** → Use **Option 3** (local installation)

## Need Help?

If you encounter any issues, let me know which option you're trying and I'll help troubleshoot!
