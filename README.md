# Idra

Idra is a Fastify application that exposes an AI agent over a streaming REST API and serves a React client through `@fastify/vite`.

## Requirements

- Node.js 22.14+
- npm 11.5.1+

## Setup

```bash
npm ci
export IDRA_PROVIDER_ID=openai
export IDRA_MODEL_ID=gpt-4.1-mini
export IDRA_API_KEY=your-api-key
npm run dev
```

The server listens on port `3000` by default. Set `PORT` or `IDRA_PORT` to override it.

## Endpoints

- `GET /` — React client
- `GET /health` — service health
- `POST /agents/messages` — streams agent events as NDJSON

```bash
curl -N http://localhost:3000/agents/messages \
  -H 'content-type: application/json' \
  -d '{"message":"Hello"}'
```

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm start
```
