# Idra

Idra is a Fastify REST API that exposes a streaming AI agent.

## Requirements

- Node.js 26.7+
- npm 12.0.2+

## Setup

```bash
npm ci
export IDRA_PROVIDER_ID=openai
export IDRA_MODEL_ID=gpt-4.1-mini
export IDRA_API_KEY=your-api-key
npm run dev
```

The server listens on port `3000`.

## Endpoints

- `GET /` — service information
- `GET /health` — service health
- `POST /agents/messages` — streams agent events as NDJSON
- `GET /storage` — reports persistent-volume status when the storage API is enabled
- `GET`, `PUT`, `DELETE /settings` — reads, replaces, or deletes `settings.json`
- `GET`, `PUT`, `DELETE /files` — lists, reads, creates, replaces, or deletes volume files

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

Start the API with Docker Compose. Setting an admin token enables and protects the storage API:

```bash
export IDRA_ADMIN_TOKEN=local-volume-test-token
docker compose up --build --wait -d
```

Or run the image directly with the same persistent data layout:

```bash
docker build -t idra .
docker volume create idra-data
docker run --name idra -d -p 3000:3000 \
  --env IDRA_ADMIN_TOKEN=local-volume-test-token \
  --volume idra-data:/data idra
```

The image keeps application code in `/app` and mutable application data in `/data`. Compose mounts the persistent `idra-data` volume at `/data`, including the main settings file and workspaces:

```text
/data/
├── settings.json
├── files/
└── workspace/
```

`IDRA_DATA_DIR` defaults to `/data` in the container. For local development it defaults to `./data` and can be overridden with the same environment variable.

Application code can manage `/data/settings.json` through `SettingsService`:

```ts
import { SettingsService } from './src/shared/settings';

const settings = new SettingsService();
settings.set('theme', 'dark');
settings.save();
settings.get('theme');
settings.getAll();
```

### Test Docker volume persistence through the API

The storage API is disabled when `IDRA_ADMIN_TOKEN` is unset because it can change persistent application data. The commands below enable it, create settings and a file, recreate the container without deleting the named volume, verify persistence, and then delete the data through the API. Use a disposable local token, never a production secret.

Start with a fresh named volume:

```bash
docker compose down --volumes
export IDRA_ADMIN_TOKEN=local-volume-test-token
docker compose up --build --wait -d
curl --fail http://localhost:3000/storage \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
```

Create the settings document and a nested UTF-8 file:

```bash
curl --fail --request PUT http://localhost:3000/settings \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN" \
	  --header 'content-type: application/json' \
  --data '{"settings":{"theme":"dark","volumeTest":true}}'

curl --fail --request PUT http://localhost:3000/files \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN" \
	  --header 'content-type: application/json' \
  --data '{"path":"checks/persistence.txt","content":"survives container recreation"}'
```

Read both resources through the server:

```bash
curl --fail http://localhost:3000/settings \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
curl --fail 'http://localhost:3000/files?path=checks%2Fpersistence.txt' \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
curl --fail http://localhost:3000/files \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
```

Recreate only the container. `docker compose down` keeps the named volume because `--volumes` is intentionally omitted:

```bash
docker compose down
docker compose up --wait -d
curl --fail http://localhost:3000/settings \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
curl --fail 'http://localhost:3000/files?path=checks%2Fpersistence.txt' \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
```

The responses must still contain `"theme":"dark"` and `survives container recreation`. Delete the resources through the server and verify the resulting empty state:

```bash
curl --fail --request DELETE 'http://localhost:3000/files?path=checks%2Fpersistence.txt' \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
curl --fail --request DELETE http://localhost:3000/settings \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
curl --fail http://localhost:3000/storage \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
curl --fail http://localhost:3000/files \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
curl --fail http://localhost:3000/settings \
  --header "authorization: Bearer $IDRA_ADMIN_TOKEN"
```

Expected final state: the storage status reports `settings.exists` as `false` and `files.count` as `0`; the file list is empty and the settings response contains `"exists":false`. Remove the test container and named volume when finished:

```bash
docker compose down --volumes
```

File paths are relative to `/data/files`. Absolute paths, `..` traversal, directories, and symbolic-link traversal are rejected.
