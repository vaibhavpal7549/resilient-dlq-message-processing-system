# Contributing Guide

Thank you for your interest in contributing to this project! 🎉  
Contributions are welcome and greatly appreciated.

This document outlines the process for contributing code, documentation,
and ideas to the **Resilient Message Processing System with Dead Letter Queue** project.

---

## How Can You Contribute?

You can contribute in several ways:

- Reporting bugs
- Suggesting new features or improvements
- Fixing issues
- Improving documentation
- Adding tests or examples
- Enhancing system design or architecture

---

## Getting Started

1. Fork the repository
2. Clone your fork locally:
   git clone https://github.com/<your-username>/resilient-dlq-message-processing-system.git
3. Create a new branch for your work:
   git checkout -b feature/your-feature-name

---

## Development Setup

### Prerequisites
- Node.js (v18 or later recommended)
- MongoDB (local or MongoDB Atlas)
- Linux or Unix-based environment (for shell scripts)

### Installation
1. Install dependencies:
   npm install
2. Create an environment file:
   cp .env.example .env
3. Start the API service:
   node api-service/app.js
4. Start the worker service:
   node worker-service/dlqWorker.js

---

## Code Style Guidelines

- Follow clean and readable JavaScript practices
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments where logic is non-trivial
- Avoid hardcoding secrets or credentials
- Use async/await for asynchronous operations

---

## Commit Message Guidelines

Please follow these commit message conventions:

- Use present tense (e.g., "Add retry mechanism")
- Keep messages concise and descriptive
- One logical change per commit

Examples:
- "Add MongoDB-backed DLQ schema"
- "Implement retry manager with threshold"
- "Add replay shell script for DLQ messages"

---

## Pull Request Process

1. Ensure your code builds and runs without errors
2. Update documentation if needed
3. Push your branch to GitHub
4. Open a Pull Request against the `main` branch
5. Clearly describe:
   - What changes were made
   - Why they are needed
   - Any breaking changes (if applicable)

Pull Requests will be reviewed as soon as possible.

---

## Reporting Bugs

If you find a bug:
- Check existing issues before creating a new one
- Provide clear steps to reproduce the issue
- Include logs or screenshots if relevant

---

## Feature Requests

For feature ideas:
- Open an issue describing the feature
- Explain the use case and benefits
- Discuss possible implementation approaches

---

## Code of Conduct

All contributors are expected to follow a respectful and professional behavior.
Harassment, discrimination, or inappropriate behavior will not be tolerated.

---

## License

By contributing to this project, you agree that your contributions will be
licensed under the same license as the project.

---

Thank you for helping make this project better! 🚀
