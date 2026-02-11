# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## PROJECT NAME
**Dead Letter Queue (DLQ) Handler – Full Stack Fault-Tolerant Message Processing System**

---

## PRODUCT OVERVIEW

The **Dead Letter Queue (DLQ) Handler** is a full-stack web application designed to simulate and implement enterprise-grade message failure handling. The system captures messages that fail processing after multiple retries, persists them safely, enables debugging and controlled reprocessing, and protects the system using a circuit breaker pattern.

The application demonstrates real-world backend architecture concepts such as retries, dead letter queues, message persistence, replay mechanisms, and overload protection, similar to systems used in cloud platforms and microservice architectures.

---

## PROBLEM STATEMENT

In asynchronous systems, messages can fail due to invalid data, external service downtime, logic errors, or system overload. Continuous retries can cause infinite loops, cascading failures, and resource exhaustion. Without a proper DLQ system, failed messages may be lost or remain unprocessed indefinitely.

This project solves that problem by:

- Isolating failed messages  
- Persisting them reliably  
- Allowing controlled retries and replay  
- Preventing system overload using circuit breakers  

---

## GOALS & OBJECTIVES

### Primary Goals
- Build a production-style Dead Letter Queue system from scratch  
- Demonstrate real-world failure handling patterns  
- Provide observability and recovery for failed messages  

### Objectives
- Route failed messages to a DLQ after retry limits  
- Persist DLQ messages with metadata  
- Provide APIs and UI to inspect DLQ messages  
- Enable replay of failed messages  
- Implement circuit breaker protection  
- Track configuration and policy changes using Git  

---

## TARGET USERS

- Backend developers  
- System design learners  
- Students working on real-world projects  
- Interview and portfolio reviewers  

---

## SYSTEM ARCHITECTURE OVERVIEW

The system consists of:

- Client (Frontend UI)  
- Express.js API Gateway  
- Message Processing Service  
- Retry & Failure Detection Logic  
- Dead Letter Queue (Unix Message Queue)  
- MongoDB Persistence Layer  
- DLQ Worker Service  
- Circuit Breaker  
- Replay Automation (Shell Scripts)  
- Configuration & Policy Repository (Git)  

---

## FUNCTIONAL REQUIREMENTS

### 6.1 Message Ingestion
- Accept messages via REST API  
- Validate incoming payloads  
- Assign unique message IDs  

### 6.2 Message Processing
- Attempt business logic processing  
- Track retry count per message  
- Retry automatically on failure  

### 6.3 Retry Policy
- Configurable retry limit (default: 3)  
- Retry delay support  
- Retry metadata tracking  

### 6.4 Dead Letter Queue
- Route messages to DLQ after retry exhaustion  
- Use Unix message queues for buffering  
- Ensure non-blocking behavior  

### 6.5 Persistence
Store DLQ messages in MongoDB, including:
- Message payload  
- Failure reason  
- Retry count  
- Timestamp  
- Status (FAILED, REPLAYED, RESOLVED)  

### 6.6 DLQ Worker
- Consume messages from DLQ  
- Perform additional retries  
- Log detailed debugging info  
- Categorize errors (temporary / permanent)  

### 6.7 Replay Mechanism
- Replay single DLQ message  
- Replay batch messages  
- Replay only after manual trigger  
- Update status after replay  

### 6.8 Circuit Breaker
- Monitor failure rate and DLQ growth  
- Open circuit when threshold exceeded  
- Block new messages temporarily  
- Auto-reset when system stabilizes  

### 6.9 Admin Dashboard
- View all DLQ messages  
- Filter by status and failure type  
- Trigger replay actions  
- View system health and circuit breaker state  

### 6.10 Configuration Management
- Retry limits and thresholds configurable  
- Policies versioned using Git  

---

## NON-FUNCTIONAL REQUIREMENTS

- High availability  
- Fault tolerance  
- Data durability  
- Scalability  
- Clear logging and observability  
- Secure APIs  
- Modular and extensible design  

---

## TECHNOLOGY STACK

### Frontend
- React.js  
- Tailwind CSS  
- Axios  

### Backend
- Node.js  
- Express.js  

### Database
- MongoDB  

### Messaging
- Unix Message Queues  

### Worker
- Node.js background worker  

### Automation
- Bash / Shell scripts  

### Patterns
- Circuit Breaker Pattern  
- Retry Pattern  

### Version Control
- Git  

### Deployment
- Linux-based environment  
- Docker (optional)  

---

## API REQUIREMENTS

- **POST /api/messages**  
  Submit a new message for processing  

- **GET /api/dlq**  
  Fetch all DLQ messages  

- **GET /api/dlq/:id**  
  Fetch single DLQ message  

- **POST /api/dlq/:id/replay**  
  Replay a failed message  

- **POST /api/dlq/replay-batch**  
  Replay multiple messages  

- **GET /api/system/health**  
  System health and circuit breaker state  

---

## DATA MODELS

### Message
- id  
- payload  
- retryCount  
- status  
- failureReason  
- createdAt  
- updatedAt  

### CircuitBreaker
- state (OPEN, CLOSED, HALF_OPEN)  
- failureCount  
- threshold  
- lastUpdated  

---

## WORKFLOW

1. Client sends message  
2. Express API receives request  
3. Processing logic executes  
4. Retry on failure  
5. Exceed retry → move to DLQ  
6. Buffer in Unix message queue  
7. Persist in MongoDB  
8. Worker processes DLQ messages  
9. Circuit breaker monitors system  
10. Admin replays messages if needed  

---

## UI REQUIREMENTS

Dashboard showing:
- Total messages  
- Failed messages  
- DLQ size  
- Circuit breaker status  

Additional UI elements:
- Table view of DLQ messages  
- Replay buttons  
- Status indicators (colors)  

---

## SECURITY REQUIREMENTS

- Input validation  
- Rate limiting  
- Admin-only replay actions  
- Secure environment variables  

---

## FUTURE ENHANCEMENTS

- Cloud queue integration (AWS SQS, Kafka)  
- Alerting and notifications  
- Distributed tracing  
- ML-based error classification  
- Multi-tenant support  
- Role-based access control  

---

## SUCCESS METRICS

- Zero message loss  
- Controlled retry behavior  
- Successful replay rate  
- System stability under load  
- Clear observability  

---

## END OF PRD


<!-- Generate full-stack working implementation based on this PRD -->
