# Contributors

This project exists thanks to the people who contribute their time, skills,
and ideas to make it better. 🚀

---

## Project Maintainer

- **Vaibhav Pal** [@vaibhavpal7549](https://github.com/vaibhavpal7549)  
  Role: Project Maintainer & Core Developer  
  Responsibilities:
  - System design and overall architecture
  - Redis → RabbitMQ migration (amqplib integration)
  - Backend API development (Express, REST endpoints)
  - RabbitMQ queue manager with delay bucketing & resilient reconnection
  - Circuit breaker pattern implementation
  - Retry logic with exponential backoff
  - DLQ routing & Unix spool fallback mechanism
  - Message processor service layer
  - Frontend application scaffolding (React + Vite)
  - CI/CD scripts, Docker configuration & deployment guide
  - Repository management, documentation & project coordination

---

## Contributors

- **Vaibhav Singh** [@vaibhavsingh056](https://github.com/vaibhavsingh056)  
  Contribution: DLQ Worker Service & MongoDB Layer  
  - DLQ worker service with RabbitMQ consumer (amqplib)
  - MongoDB schema design & database integration
  - Fetch & process DLQ messages
  - Retry strategies (fixed, exponential, linear backoff)
  - Failure classification & error logging (reason, timestamps)
  - Worker health monitoring & graceful shutdown
  - Branch: `dlq-worker`

- **Utkarsh Upadhyay** [@utkarshupadhyay249-commits](https://github.com/utkarshupadhyay249-commits)  
  Contribution: Circuit Breaker + Shell Scripts + Unix MQ  
  - Circuit breaker logic with failure rate calculation
  - Blocking DLQ input when error threshold exceeded
  - Shell scripts for DLQ replay & resolution (`replay-dlq.sh`, `replay-all-failed-dlq.sh`, `resolve-dlq-message.sh`)
  - Unix message queue demo (`unix_queue_demo.sh`)
  - Branch: `circuit-breaker-scripts`

- **Vaishnavi Rajpoot** [@Vaishnavi-18110](https://github.com/Vaishnavi-18110)  
  Contribution: Frontend Dashboard + API Documentation  
  - DLQ dashboard UI with status filters (failed / retried / resolved)
  - API to fetch & display DLQ data
  - Status monitoring dashboard
  - API documentation (`API_DOCUMENTATION.md`)
  - README & architecture diagram explanations
  - Branch: `dlq-dashboard`

---

## Tech Stack (Current)

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Backend API | Node.js, Express, Helmet, CORS          |
| Message Queue | RabbitMQ (amqplib)                    |
| Database    | MongoDB (Mongoose)                      |
| Worker      | Node.js, amqplib, Winston               |
| Frontend    | React, Vite, TailwindCSS                |
| Monitoring  | prom-client (Prometheus), Winston logs   |
| Testing     | Jest, Supertest                         |
| Scripts     | Bash, PowerShell, Node.js CLI           |

---

## How to Become a Contributor

1. Fork the repository
2. Create a feature or fix branch
3. Make your changes following the CONTRIBUTING guidelines
4. Submit a Pull Request
5. Once merged, your name will be added to this file

---

## Recognition

All contributors are valued equally, whether they contribute code,
documentation, testing, design, or ideas.

Thank you for helping improve this project! 🙌
