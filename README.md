# Idra

Idra is a Fastify REST API that exposes a streaming AI agent.

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

- `GET /` — service information
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

## Docker

Start the API with Docker Compose:

```bash
docker compose up --build -d
```

The image keeps application code in `/app` and mutable application data in `/data`. Compose mounts the persistent `idra-data` volume at `/data`, including the main settings file and workspaces:

```text
/data/
├── settings.json
└── workspace/
```

`IDRA_DATA_DIR` defaults to `/data` in the container. For local development it defaults to `./data` and can be overridden with the same environment variable.

Application code can manage `/data/settings.json` through `SettingsService`:

```ts
const settings = new SettingsService();
settings.set('theme', 'dark');
settings.save();
settings.get('theme');
settings.getAll();
```

```bash
curl http://localhost:3000/
docker compose down
docker compose down --volumes # also delete stored data
```
