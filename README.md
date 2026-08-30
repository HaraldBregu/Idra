<img src="public/generated/idra-header-mesh-left-logo.png" alt="Idra A2A agent" width="100%">

# Idra

Idra is a self-hosted AI agent exposed only through the [A2A 1.0 protocol](https://a2a-protocol.org/v1.0.0/specification/) and an administrator-only `/config` REST API. It has no browser console or alternate messaging endpoint. Calling agents authenticate with OAuth 2.0 client credentials and asymmetric `private_key_jwt` assertions, then use short-lived, audience- and scope-restricted access tokens.

## Deploy with Docker Compose

Docker Compose is the supported server installation. It pins the runtime, runs Idra as a non-root user, keeps the application filesystem read-only, and stores durable state in a named volume.

You need Docker with Docker Compose, an API key for Anthropic, OpenAI, or DeepSeek, and an HTTPS hostname for production.

```bash
git clone https://github.com/HaraldBregu/idra.git
cd idra
cp .env.example .env
chmod 600 .env
```

Generate independent administrator and encryption secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Put them in `.env`. Provider settings are optional because they can be written later through `/config`:

```dotenv
IDRA_PUBLIC_URL=https://agent.example.com
IDRA_ADMIN_TOKEN=<first-generated-value>
IDRA_CONFIG_KEY=<second-generated-value>
```

`IDRA_PUBLIC_URL` is the public origin, without `/a2a` or a trailing path. It must use HTTPS except for loopback development. `IDRA_ADMIN_TOKEN` must contain at least 32 UTF-8 bytes. `IDRA_CONFIG_KEY` must encode exactly 32 random bytes and is used to encrypt provider and signing secrets at rest. Losing or changing it makes the encrypted configuration unreadable.

Validate and start the service:

```bash
docker compose config --quiet
docker compose up --build --wait -d
```

Compose binds `127.0.0.1:3000` by default. Terminate TLS at a reverse proxy and forward the public hostname to that address. For example, a Caddy site can use:

```caddyfile
agent.example.com {
	reverse_proxy 127.0.0.1:3000 {
		flush_interval -1
	}
}
```

Keep SSE buffering disabled and choose a proxy idle timeout long enough for agent runs.

Configure a provider after the HTTPS proxy is active:

```bash
curl --fail-with-body -X PUT https://agent.example.com/config/provider \
  -H 'Authorization: Bearer <IDRA_ADMIN_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"provider":"openai","model":"<current-model-id>","apiKey":"<provider-api-key>"}'
```

The API never returns the API key. It persists encrypted inside the data volume.

## Use the A2A interface

Agent Card and OAuth discovery are public at:

```text
GET /.well-known/agent-card.json
GET /.well-known/oauth-authorization-server
GET /.well-known/oauth-protected-resource/a2a
```

An administrator registers each calling agent's Ed25519 public JWK through `POST /config/clients`. The calling agent keeps its private key, authenticates at `/a2a/oauth/token` with `private_key_jwt`, and receives a five-minute token for audience `https://agent.example.com/a2a` and scope `a2a.invoke`.

Every A2A operation then requires:

```http
A2A-Version: 1.0
Authorization: Bearer <short-lived-access-token>
```

Follow [Using Idra over A2A](USAGE.md) for key generation, client registration, token acquisition, prompts, task operations, and an official JavaScript SDK example.

Only public discovery, `/a2a`, and administrator-authenticated `/config` routes are registered. `/`, `/access`, `/ui`, `/agents/messages`, `/provider`, `/storage`, `/mcp`, and `/health` are unavailable. The container health check uses the Agent Card endpoint.

## Data and capabilities

Idra stores its working data in the `idra-data` Docker volume. Recreating the container with `docker compose down` followed by `docker compose up --wait -d` keeps that volume and its contents. Do not add `--volumes` unless you intend to remove the stored data.

The workspace is `/data/workspace`. Its `AGENTS.md` file contains durable guidance for the agent. A2A requests can use only the workspace-bound `read`, `write`, and `edit` tools. Shell commands, MCP servers, subagents, and administrative operations are unavailable through the server channel.

Task records and conversations persist under `/data`, are scoped to the authenticated client, and terminal A2A tasks are retained for 30 days. Provider requests still send relevant prompt content to the configured model provider.

## Security

- Keep `.env` mode `0600` and never commit it.
- Keep the administrator token and configuration encryption key separate and offline from calling agents.
- Register one Ed25519 public key per calling agent; Idra never stores client private keys.
- Delete a client through `/config/clients/:clientId` to revoke all of its access tokens immediately.
- Keep port 3000 on loopback and expose it only through an HTTPS reverse proxy.
- Access tokens expire after five minutes and cannot authorize `/config`.
- Back up and protect the Docker volume; it contains workspace and conversation data.
- Review your model provider's data-handling policy.

Stop or update the deployment with:

```bash
docker compose down
docker compose pull
docker compose up --build --wait -d
```

## Project

Idra is available under the [MIT License](LICENSE).

- Follow [Using Idra over A2A](USAGE.md) for prompts, continued conversations, task management, and official SDK examples.
- Learn how to set up the development environment and submit changes in [CONTRIBUTING.md](CONTRIBUTING.md).
- Read the supported versions, vulnerability scope, and private reporting process in [SECURITY.md](SECURITY.md).
