# Dead Letter Queue (DLQ) Handler

A full-stack web application with a React + Tailwind frontend, Express backend, MongoDB persistence, a Node.js worker service, Unix-style queue simulation, and Bash automation scripts.

## Folder Tree

```text
dlq/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── circuit-breaker/
│   │   ├── db/
│   │   ├── dlq/
│   │   ├── processor/
│   │   ├── queue/
│   │   ├── retry/
│   │   └── utils/
│   └── package.json
├── worker/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.js
│   └── package.json
├── scripts/
│   ├── demo-dlq.ps1
│   ├── demo-dlq.sh
│   ├── replay-dlq.ps1
│   ├── replay-dlq.sh
│   └── unix_queue_demo.sh
├── config/
│   ├── circuit-breaker.json
│   └── retry-policies.json
├── docker/
├── .env
├── .env.example
├── HOW_TO_RUN.md
├── README.md
└── package.json
```

## Initial Setup Commands

Install dependencies for each service:

```bash
cd backend
npm install

cd ../frontend
npm install

cd ../worker
npm install
```

Or run them from the repo root one at a time:

```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix worker install
```

Copy environment variables:

```bash
copy .env.example .env
```

## Start The Application

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Worker:

```bash
npm run dev:worker
```

## Basic Server Startup Code

The Express server entrypoint is [server.js](/d:/dlq/backend/src/api/server.js:1). It:

- loads environment variables with `dotenv`
- creates the Express app
- registers middleware and API routes
- connects MongoDB
- initializes the queue and processor

Main backend script:

```js
require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'Dead Letter Queue Handler', status: 'running' });
});

app.listen(process.env.PORT || 3000);
```

## Basic Client Startup Code

The React entrypoints are [main.jsx](/d:/dlq/frontend/src/main.jsx:1) and [App.jsx](/d:/dlq/frontend/src/App.jsx:1). Vite boots the app and Tailwind styles are loaded from [index.css](/d:/dlq/frontend/src/index.css:1).

Main frontend script:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Service Package Files

- Root scripts: [package.json](/d:/dlq/package.json:1)
- Backend service: [backend/package.json](/d:/dlq/backend/package.json:1)
- Frontend service: [frontend/package.json](/d:/dlq/frontend/package.json:1)
- Worker service: [worker/package.json](/d:/dlq/worker/package.json:1)

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/api/system/health`
