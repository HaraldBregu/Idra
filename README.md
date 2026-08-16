# Idra

Idra is a Fastify REST API that exposes a streaming AI agent.

## Requirements

- Node.js 26.7+
- npm 12.0.2+

## Setup

```bash
npm ci
npm run dev
```

The server listens on port `3000`. Open [http://localhost:3000](http://localhost:3000). On first run:

1. Select **Generate access key**.
2. Copy the generated key and store it somewhere safe.
3. Paste it into the access field and select **Save and continue**.

The browser receives a one-year, `HttpOnly` login cookie and redirects to the agent console. Later visits open the console directly while that login remains valid. If the browser login is cleared, enter the saved access key again.

After login, configure Anthropic, OpenAI, or DeepSeek from the **Provider and model** panel. The model field accepts the provider's current model ID and the provider API key remains server-side.

`IDRA_ADMIN_TOKEN` remains an optional bearer token for CLI/API access. `IDRA_PROVIDER_ID`, `IDRA_MODEL_ID`, `IDRA_API_KEY`, and `IDRA_BASE_URL` remain available as an environment-variable fallback when no UI provider configuration exists.

## Endpoints

- `GET /` — opens the protected agent and storage console
- `GET /access` — opens first-run setup or login
- `GET /access/status` — reports whether access is configured and authenticated
- `POST /access/session` — saves the first access key or logs in with the existing key
- `GET /storage-test` — alternate URL for the agent and storage console
- `GET /health` — service health
- `POST /agents/messages` — streams agent events as NDJSON; requires the login cookie or admin bearer token
- `GET`, `PUT`, `DELETE /provider` — manages the write-only provider configuration
- `GET /storage` — reports persistent-volume status when the storage API is enabled
- `GET`, `PUT`, `DELETE /settings` — reads, replaces, or deletes `settings.json`
- `GET`, `PUT`, `DELETE /files` — lists, reads, creates, replaces, or deletes volume files

```bash
curl -N http://localhost:3000/agents/messages \
  -H "authorization: Bearer $IDRA_ADMIN_TOKEN" \
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
docker compose up --build --wait -d
```

Open [http://localhost:3000](http://localhost:3000), generate and save the first access key, and keep your copy in a safe place. The page then provides:

- provider, model, and write-only API-key setup for Anthropic, OpenAI, and DeepSeek;
- a prompt editor with live streamed agent responses and follow-up session continuity;
- live volume, settings, and file status;
- manual settings load, save, and deletion;
- manual file creation, reading, listing, overwriting, and deletion;
- a safe full API suite that restores existing settings after it finishes;
- a persistence checkpoint for verifying data after container recreation;
- a request log with status codes, timings, and response bodies.

For the persistence checkpoint, select **Prepare marker**, run the displayed container recreation command, reopen the page, select **Verify after restart**, and finally select **Clean marker**.

Or run the image directly with the same persistent data layout:

```bash
docker build -t idra .
docker volume create idra-data
docker run --name idra -d -p 3000:3000 \
  --volume idra-data:/data idra
```

The image keeps application code in `/app` and mutable application data in `/data`. Compose mounts the persistent `idra-data` volume at `/data`, including the main settings file and workspaces:

```text
/data/
├── access.json
├── provider.json
├── settings.json
├── files/
└── workspace/
```

`access.json` is created with file mode `0600` and contains a salted scrypt verifier plus a session-signing secret, never the plaintext access key. `provider.json` is also written with mode `0600`; its API key is never returned by `GET /provider` or populated back into the browser. Protect access to the Docker volume.

If the access key is lost, stop the app and deliberately remove only `/data/access.json` from the volume to return to first-run setup. Anyone who can reach an unconfigured app can claim its first key, so complete setup before exposing the service beyond the Compose default of `127.0.0.1`.

`IDRA_DATA_DIR` defaults to `/data` in the container. For local development it defaults to `./data` and can be overridden with the same environment variable.

Application code can manage `/data/settings.json` through `SettingsService`:

```ts
import { SettingsService } from './src/main/shared/settings';

const settings = new SettingsService();
settings.set('theme', 'dark');
settings.save();
settings.get('theme');
settings.getAll();
```

### Test Docker volume persistence through the API

The browser uses its access-session cookie. For command-line volume tests, set the optional `IDRA_ADMIN_TOKEN`; its bearer token can access the same protected endpoints. The commands below create settings and a file, recreate the container without deleting the named volume, verify persistence, and then delete the data through the API. Use a disposable local token, never a production secret.

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
