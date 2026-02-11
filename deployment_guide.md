# Deployment & Operational Guide

## Technology Stack

### Core Dependencies
- **Node.js**: v18+ (LTS)
- **Express.js**: v4.18+
- **MongoDB**: v6.0+ (with replica set for production)
- **Redis**: v7.0+ (for distributed locking and caching)

### Optional Dependencies
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **Docker**: Containerization
- **Kubernetes**: Orchestration (production)

---

## Project Structure

```
dlq-message-system/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── messages.js
│   │   │   ├── dlq.js
│   │   │   └── health.js
│   │   ├── middleware/
│   │   │   ├── circuitBreaker.js
│   │   │   └── validation.js
│   │   └── server.js
│   ├── queue/
│   │   ├── unixQueue.js
│   │   └── queueManager.js
│   ├── processor/
│   │   ├── primaryProcessor.js
│   │   └── workerPool.js
│   ├── retry/
│   │   ├── retryManager.js
│   │   └── backoffStrategy.js
│   ├── circuit-breaker/
│   │   ├── circuitBreaker.js
│   │   └── stateManager.js
│   ├── dlq/
│   │   ├── dlqRouter.js
│   │   ├── dlqWorker.js
│   │   └── replayService.js
│   ├── db/
│   │   ├── mongodb.js
│   │   └── schemas/
│   │       └── dlqMessage.js
│   └── utils/
│       ├── logger.js
│       ├── metrics.js
│       └── alerting.js
├── scripts/
│   ├── replay-dlq.sh
│   ├── replay.js
│   └── health-check.sh
├── config/
│   ├── default.json
│   ├── development.json
│   ├── staging.json
│   └── production.json
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── secrets.yaml
├── monitoring/
│   ├── prometheus.yml
│   └── grafana-dashboards/
├── .env.example
├── package.json
└── README.md
```

---

## Installation & Setup

### 1. Local Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/dlq-message-system.git
cd dlq-message-system

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: MONGODB_URI, REDIS_URI, NODE_ENV

# Start MongoDB (via Docker)
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Start Redis (via Docker)
docker run -d -p 6379:6379 --name redis redis:7.0

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### 2. Configuration Management

**Environment Variables** (`.env`):
```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://localhost:27017/dlq_system
MONGODB_POOL_SIZE=10

# Redis
REDIS_URI=redis://localhost:6379
REDIS_PREFIX=dlq:

# Circuit Breaker
CB_FAILURE_THRESHOLD=0.5
CB_TIME_WINDOW_MS=60000
CB_OPEN_TIMEOUT_MS=30000

# Retry Configuration
MAX_RETRIES=3
BASE_BACKOFF_MS=1000

# DLQ Worker
DLQ_POLL_INTERVAL_MS=30000
DLQ_BATCH_SIZE=10
DLQ_MAX_RETRIES=5

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
```

**Configuration Files** (`config/production.json`):
```json
{
  "server": {
    "port": 3000,
    "workers": 4
  },
  "queue": {
    "type": "redis",
    "concurrency": 10,
    "maxQueueSize": 100000
  },
  "circuitBreaker": {
    "failureThreshold": 0.5,
    "timeWindowMs": 60000,
    "openTimeoutMs": 30000,
    "halfOpenMaxRequests": 10,
    "halfOpenSuccessThreshold": 0.8
  },
  "retry": {
    "maxRetries": 3,
    "baseBackoffMs": 1000,
    "maxBackoffMs": 30000,
    "jitterPercent": 20
  },
  "dlq": {
    "pollIntervalMs": 30000,
    "batchSize": 10,
    "maxRetries": 5,
    "strategies": {
      "immediate": [1, 5, 15, 30, 60],
      "scheduled": [2, 3, 4],
      "conditional": true
    }
  },
  "monitoring": {
    "enabled": true,
    "prometheus": true,
    "grafana": true,
    "alerting": {
      "slack": true,
      "pagerduty": true
    }
  }
}
```

---

## Deployment Strategies

### Docker Deployment

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose ports
EXPOSE 3000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node scripts/health-check.js || exit 1

# Start application
CMD ["node", "src/api/server.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
      - "9090:9090"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/dlq_system
      - REDIS_URI=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped

  dlq-worker:
    build: .
    command: node src/dlq/dlqWorker.js
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/dlq_system
      - REDIS_URI=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7.0
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboards:/etc/grafana/provisioning/dashboards
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

**Deploy with Docker Compose**:
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Scale DLQ workers
docker-compose up -d --scale dlq-worker=5

# Stop all services
docker-compose down
```

---

### Kubernetes Deployment

**deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dlq-api
  labels:
    app: dlq-system
    component: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dlq-system
      component: api
  template:
    metadata:
      labels:
        app: dlq-system
        component: api
    spec:
      containers:
      - name: api
        image: your-registry/dlq-system:latest
        ports:
        - containerPort: 3000
        - containerPort: 9090
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: dlq-secrets
              key: mongodb-uri
        - name: REDIS_URI
          valueFrom:
            secretKeyRef:
              name: dlq-secrets
              key: redis-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dlq-worker
  labels:
    app: dlq-system
    component: worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: dlq-system
      component: worker
  template:
    metadata:
      labels:
        app: dlq-system
        component: worker
    spec:
      containers:
      - name: worker
        image: your-registry/dlq-system:latest
        command: ["node", "src/dlq/dlqWorker.js"]
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: dlq-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**Deploy to Kubernetes**:
```bash
# Create namespace
kubectl create namespace dlq-system

# Create secrets
kubectl create secret generic dlq-secrets \
  --from-literal=mongodb-uri='mongodb://...' \
  --from-literal=redis-uri='redis://...' \
  -n dlq-system

# Apply configurations
kubectl apply -f k8s/ -n dlq-system

# Check deployment status
kubectl get pods -n dlq-system

# View logs
kubectl logs -f deployment/dlq-api -n dlq-system

# Scale workers
kubectl scale deployment dlq-worker --replicas=10 -n dlq-system
```

---

## Operational Procedures

### Monitoring

**Prometheus Metrics**:
```yaml
# monitoring/prometheus.yml
scrape_configs:
  - job_name: 'dlq-api'
    static_configs:
      - targets: ['api:9090']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'dlq-worker'
    static_configs:
      - targets: ['dlq-worker:9090']
    scrape_interval: 30s
```

**Key Metrics to Monitor**:
- `dlq_messages_ingested_total` - Total messages entering DLQ
- `dlq_messages_resolved_total` - Total messages successfully recovered
- `dlq_backlog_size` - Current DLQ pending count
- `circuit_breaker_state` - Current circuit state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)
- `message_processing_duration_seconds` - Processing latency histogram
- `retry_attempts_total` - Retry count by attempt number

### Alerting

**Alert Rules** (Prometheus):
```yaml
groups:
  - name: dlq_alerts
    interval: 30s
    rules:
      - alert: HighDLQIngestionRate
        expr: rate(dlq_messages_ingested_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High DLQ ingestion rate"
          description: "DLQ receiving {{ $value }} msgs/min"

      - alert: CircuitBreakerTripped
        expr: circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is OPEN"
          description: "System is rejecting requests"

      - alert: DLQBacklogGrowing
        expr: dlq_backlog_size > 10000
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "DLQ backlog exceeds 10k"
```

### Incident Response

**Circuit Breaker Tripped**:
```bash
# 1. Check system health
curl http://localhost:3000/api/health

# 2. Review recent errors
kubectl logs -f deployment/dlq-api --tail=100 | grep ERROR

# 3. Check downstream services
curl http://external-api/health

# 4. If safe, manually close circuit
curl -X POST http://localhost:3000/admin/circuit-breaker/force-close \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. Monitor recovery
watch -n 5 'curl -s http://localhost:3000/api/health | jq .'
```

**DLQ Backlog Growing**:
```bash
# 1. Analyze error distribution
node scripts/analyze-dlq.js --group-by errorType

# 2. Identify root cause
mongo dlq_system --eval 'db.dlq_messages.aggregate([
  { $group: { _id: "$errorType", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])'

# 3. Fix underlying issue (e.g., external API)

# 4. Replay failed messages
./scripts/replay-dlq.sh \
  --error-type "TIMEOUT_ERROR" \
  --start-date "2026-02-11T00:00:00Z" \
  --batch-size 100
```

---

## Maintenance Tasks

### Daily
- Review DLQ backlog size
- Check circuit breaker trip count
- Monitor error rate trends
- Verify worker health

### Weekly
- Analyze DLQ error patterns
- Review retry success rates
- Optimize configuration based on metrics
- Clean up resolved DLQ messages (automated)

### Monthly
- Review and update retry policies
- Capacity planning based on growth
- Security updates and patches
- Disaster recovery drill

---

## Troubleshooting Guide

### Messages Not Processing

**Symptoms**: Queue depth growing, no processing activity

**Diagnosis**:
```bash
# Check worker status
kubectl get pods -l component=worker

# Check queue depth
redis-cli LLEN dlq:message_queue

# Check MongoDB connection
mongo --eval 'db.adminCommand({ ping: 1 })'
```

**Solutions**:
- Restart workers: `kubectl rollout restart deployment/dlq-worker`
- Scale workers: `kubectl scale deployment/dlq-worker --replicas=10`
- Check resource limits: `kubectl top pods`

### High Latency

**Symptoms**: Processing time > 1s

**Diagnosis**:
```bash
# Check system resources
kubectl top nodes
kubectl top pods

# Review slow queries
mongo dlq_system --eval 'db.currentOp({ "secs_running": { $gt: 1 } })'
```

**Solutions**:
- Add MongoDB indexes
- Increase worker concurrency
- Optimize business logic
- Scale horizontally

### DLQ Messages Not Replaying

**Symptoms**: Replay script completes but messages still pending

**Diagnosis**:
```bash
# Check message status
mongo dlq_system --eval 'db.dlq_messages.find({ 
  status: "dlq_pending" 
}).limit(5).pretty()'

# Check for locks
mongo dlq_system --eval 'db.dlq_messages.find({ 
  lockedBy: { $ne: null },
  lockedAt: { $lt: new Date(Date.now() - 300000) }
}).count()'
```

**Solutions**:
- Clear stale locks: `node scripts/clear-stale-locks.js`
- Verify system health before replay
- Check replay script logs

---

## Disaster Recovery

### Backup Strategy

**MongoDB Backups**:
```bash
# Daily automated backup
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Restore from backup
mongorestore --uri="$MONGODB_URI" /backups/20260211
```

**Configuration Backups**:
- All configs in Git (version controlled)
- Tag releases: `git tag -a v1.2.3 -m "Release 1.2.3"`

### Recovery Procedures

**Complete System Failure**:
1. Restore MongoDB from latest backup
2. Deploy latest stable version from Git
3. Verify configuration matches production
4. Start services in order: MongoDB → Redis → API → Workers
5. Run health checks
6. Monitor metrics for 1 hour

**Data Corruption**:
1. Identify affected time range
2. Restore MongoDB to point-in-time before corruption
3. Replay messages from backup
4. Verify data integrity

---

## Performance Tuning

### MongoDB Optimization
```javascript
// Create indexes
db.dlq_messages.createIndex({ status: 1, createdAt: -1 });
db.dlq_messages.createIndex({ messageId: 1 }, { unique: true });
db.dlq_messages.createIndex({ "metadata.source": 1, status: 1 });
db.dlq_messages.createIndex({ nextRetryAt: 1 }, { 
  partialFilterExpression: { status: "dlq_pending" }
});

// Enable compression
db.adminCommand({ setParameter: 1, wiredTigerEngineRuntimeConfig: "cache_size=2GB" });
```

### Worker Pool Tuning
```javascript
// Adjust based on workload
const config = {
  concurrency: 20,        // Increase for I/O-bound tasks
  batchSize: 50,          // Larger batches for throughput
  pollInterval: 10000     // Reduce for lower latency
};
```

### Circuit Breaker Tuning
```javascript
// Adjust thresholds based on SLAs
const config = {
  failureThreshold: 0.6,  // More tolerant (60%)
  timeWindowMs: 120000,   // Longer window (2 minutes)
  openTimeoutMs: 60000    // Longer recovery time (1 minute)
};
```
