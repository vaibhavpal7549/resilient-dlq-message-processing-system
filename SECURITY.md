# Security Policy

## Supported Versions

The following versions of this project are currently supported with security updates:

| Version | Supported |
|--------|-----------|
| main   | ✅ Yes     |
| older releases | ❌ No |

Only the latest version available on the `main` branch is actively maintained.

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

### How to Report
- Do NOT create a public GitHub issue for security vulnerabilities.
- Send details via one of the following:
  - GitHub Security Advisories (preferred)
  - Email to the project maintainer (if configured)

### What to Include
Please include as much information as possible:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix or mitigation (if available)

---

## Response Timeline

- **Acknowledgement:** Within 48 hours  
- **Initial Assessment:** Within 3–5 days  
- **Fix & Disclosure:** As soon as a patch is available  

Critical vulnerabilities will be prioritized.

---

## Security Measures Implemented

This project follows basic security best practices, including:

- Input validation at API boundaries
- Retry limits to prevent abuse and infinite loops
- Circuit breaker mechanism to prevent cascading failures
- Isolation of DLQ processing via worker service
- Environment variable usage for sensitive configuration
- MongoDB schema validation for DLQ persistence
- Git-based tracking of configuration and policy changes

---

## Known Limitations

- Authentication and authorization are not implemented in the base version
- Rate limiting is recommended for production deployments
- Secrets management should be handled via secure vaults in real deployments

---

## Recommendations for Production Use

If deploying this system in production:
- Add API authentication (JWT / OAuth)
- Enable HTTPS and TLS
- Use secrets managers instead of `.env` files
- Implement audit logging for replay operations
- Apply rate limiting and request throttling
- Restrict DLQ replay access to authorized roles only

---

## Disclaimer

This project is intended for educational and demonstration purposes.
While it follows real-world design principles inspired by enterprise messaging systems
such as AWS SQS and RabbitMQ, additional security hardening is required for production use.
