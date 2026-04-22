# 🐳 Docker Setup Guide

This guide explains how to run the **Resilient DLQ Message Processing System** using Docker Compose.

---

## Prerequisites

Before starting, make sure you have the following installed:

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | v20+ | `docker --version` |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ (included with Docker Desktop) | `docker compose version` |

> [!NOTE]
> Docker Desktop for Windows/Mac comes with Docker Compose v2 built-in. No separate installation needed.

---

## Architecture Overview

Docker Compose sets up **5 services** that work together:

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐              │
│  │ MongoDB  │  │ RabbitMQ  │  │ Frontend │              │
│  │ :27017   │  │ :5672     │  │ :5173    │              │
│  │          │  │ :15672 🖥️ │  │          │              │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────┴──────────────┴──────┐       │                    │
│  │        Backend           │◄──────┘                    │
│  │        :3000             │                            │
│  └────┬─────────────────────┘                            │
│       │                                                  │
│  ┌────┴─────────────────────┐                            │
│  │        Worker            │                            │
│  │   (DLQ Processor)       │                            │
│  └──────────────────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

| Service | Port | Description |
|---------|------|-------------|
| **MongoDB** | `27017` | Database — stores messages & DLQ data |
| **RabbitMQ** | `5672` | Message broker for queue processing |
| **RabbitMQ Management** | `15672` | Web dashboard to monitor queues |
| **Backend** | `3000` | REST API server |
| **Frontend** | `5173` | Dashboard UI (Vite + React) |
| **Worker** | — | Background DLQ processor (no exposed port) |

---

## 🚀 Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/vaibhavpal7549/resilient-dlq-message-processing-system.git
cd resilient-dlq-message-processing-system
```

### Step 2: Start All Services

```bash
# Navigate to docker directory
cd docker

# Start all containers in detached mode
docker compose up -d
```

> [!TIP]
> The `-d` flag runs containers in the background. Remove it to see live logs in your terminal.

### Step 3: Verify Services Are Running

```bash
docker compose ps
```

You should see all 5 containers with status `Up` or `healthy`:

```
NAME              STATUS                  PORTS
dlq-mongodb       Up (healthy)            0.0.0.0:27017->27017/tcp
dlq-rabbitmq      Up (healthy)            0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
dlq-backend       Up                      0.0.0.0:3000->3000/tcp
dlq-worker        Up
dlq-frontend      Up                      0.0.0.0:5173->5173/tcp
```

### Step 4: Access the Application

| Service | URL |
|---------|-----|
| 🖥️ **Frontend Dashboard** | [http://localhost:5173](http://localhost:5173) |
| 🔌 **Backend API** | [http://localhost:3000](http://localhost:3000) |
| 🐰 **RabbitMQ Dashboard** | [http://localhost:15672](http://localhost:15672) |
| 💚 **Health Check** | [http://localhost:3000/api/system/health](http://localhost:3000/api/system/health) |

> **RabbitMQ Dashboard Login:**
> - Username: `guest`
> - Password: `guest`

---

## 📋 Common Commands

### Start / Stop / Restart

```bash
# Start all services
docker compose up -d

# Stop all services (keeps data)
docker compose down

# Restart all services
docker compose restart

# Restart a specific service
docker compose restart backend
```

### View Logs

```bash
# View all service logs
docker compose logs

# View logs for a specific service
docker compose logs backend
docker compose logs worker
docker compose logs rabbitmq

# Follow logs in real-time (live tail)
docker compose logs -f

# Follow logs of a specific service
docker compose logs -f backend

# View last 100 lines
docker compose logs --tail 100 backend
```

### Rebuild Images

```bash
# Rebuild all images (after code changes)
docker compose up -d --build

# Rebuild a specific service
docker compose up -d --build backend

# Force rebuild without cache
docker compose build --no-cache
docker compose up -d
```

### Container Shell Access

```bash
# Access backend container shell
docker compose exec backend sh

# Access MongoDB shell
docker compose exec mongodb mongosh dlq_system

# Access RabbitMQ CLI
docker compose exec rabbitmq rabbitmqctl status
```

---

## 🗑️ Cleanup

```bash
# Stop and remove containers (data volumes are preserved)
docker compose down

# Stop and remove containers + delete all data volumes
docker compose down -v

# Remove everything including images
docker compose down -v --rmi all
```

> [!WARNING]
> `docker compose down -v` will **permanently delete** all MongoDB data and RabbitMQ queues. Use with caution.

---

## 🔧 Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker compose logs <service-name>

# Check if ports are already in use
netstat -ano | findstr :3000
netstat -ano | findstr :5672
netstat -ano | findstr :27017
```

### RabbitMQ not ready

RabbitMQ takes a few seconds to initialize. Backend and Worker will wait for RabbitMQ's health check to pass before starting.

```bash
# Check RabbitMQ health
docker compose exec rabbitmq rabbitmq-diagnostics -q ping
```

### MongoDB connection issues

```bash
# Check MongoDB health
docker compose exec mongodb mongosh --eval "db.runCommand('ping')"
```

### Reset everything and start fresh

```bash
# Nuclear option — removes all containers, volumes, and images
docker compose down -v --rmi all
docker compose up -d --build
```

---

## 📁 File Structure

```
docker/
├── docker-compose.yml      # Main compose file — defines all services
├── Dockerfile.backend      # Backend image — Node.js API server
├── Dockerfile.frontend     # Frontend image — Vite build + Nginx
├── Dockerfile.worker       # Worker image — DLQ processor
└── nginx.conf              # Nginx config — reverse proxy for frontend
```

---

## 🌐 Environment Variables

All environment variables are pre-configured in `docker-compose.yml` for local development. Key variables:

| Variable | Service | Default Value |
|----------|---------|---------------|
| `MONGODB_URI` | Backend, Worker | `mongodb://mongodb:27017/dlq_system` |
| `RABBITMQ_URL` | Backend, Worker | `amqp://guest:guest@rabbitmq:5672` |
| `PORT` | Backend | `3000` |
| `QUEUE_NAME` | Backend, Worker | `message-processing` |
| `LOG_LEVEL` | Backend, Worker | `info` |
| `DLQ_MAX_RETRIES` | Worker | `5` |
| `DLQ_POLL_INTERVAL_MS` | Worker | `30000` (30 seconds) |

> [!NOTE]
> Docker containers use internal service names (e.g., `mongodb`, `rabbitmq`) for networking. These are automatically resolved by Docker's internal DNS.
>
> The frontend container is served by Nginx on internal port `80`, which is published as `http://localhost:5173`. In Docker, frontend API requests use the same origin and are proxied by Nginx to the backend service.
