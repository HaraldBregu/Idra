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
npm test
npm run test:watch
npm run test:coverage
npm run typecheck
npm run build
npm start
```

## API tests

`npm test` runs the automated test suite with Node's built-in test runner. The API tests use Fastify request injection, so they exercise the real routes, validation, headers, and NDJSON streaming without a browser, a listening server, or provider credentials.

Use `npm run test:watch` while developing and `npm run test:coverage` for a coverage report. The same test, typecheck, and build commands run automatically in GitHub Actions on pushes and pull requests.

## Docker

Start the API with Docker Compose:

```bash
docker compose up --build -d
```

Or run the image directly with the same persistent data layout:

```bash
docker build -t idra .
docker volume create idra-data
docker run --name idra -d -p 3000:3000 --volume idra-data:/data idra
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
import { SettingsService } from './settings';

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
