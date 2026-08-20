# Using Idra over A2A

This guide shows how to start Idra, send prompts through A2A, continue a conversation, and manage tasks. Idra has no browser interface or alternate agent API: discovery uses the Agent Card, and every agent operation uses A2A 1.0 HTTP+JSON.

## Prerequisites

You need:

- Docker with Docker Compose;
- an Anthropic, OpenAI, or DeepSeek API key;
- a current model ID for that provider; and
- an HTTPS hostname and reverse proxy for a production server.

For the complete reverse-proxy and security setup, see the [deployment guide](README.md#deploy-with-docker-compose).

## Configure and start Idra

Clone the repository and create the local environment file:

```bash
git clone https://github.com/HaraldBregu/idra.git
cd idra
cp .env.example .env
openssl rand -hex 32
chmod 600 .env
```

Copy the generated token into `.env` and add your provider configuration:

```dotenv
IDRA_PUBLIC_URL=https://agent.example.com
IDRA_AGENT_TOKEN=<generated-token>
IDRA_PROVIDER_ID=openai
IDRA_MODEL_ID=<current-model-id>
IDRA_API_KEY=<provider-api-key>
```

`IDRA_PUBLIC_URL` is the public origin only. Do not add `/a2a` to it. Production URLs must use HTTPS; local development may use `http://127.0.0.1:3000`.

Validate and start the container:

```bash
docker compose config --quiet
docker compose up --build --wait -d
docker compose ps
```

The service is ready when Compose reports it as healthy. The health check reads the standard Agent Card rather than a separate health API.

## Set client variables

The examples below use these shell variables. Set them to the same public URL and A2A token configured in `.env`:

```bash
export IDRA_URL='https://agent.example.com'
export IDRA_TOKEN='<generated-token>'
```

Treat `IDRA_TOKEN` like a password. Anyone holding it can access every task and conversation stored by this single-user deployment.

## Verify discovery

The Agent Card is public because A2A clients use it to discover the protocol endpoint, version, authentication scheme, and capabilities:

```bash
curl --fail-with-body "$IDRA_URL/.well-known/agent-card.json"
```

The response should advertise:

- `HTTP+JSON` protocol binding;
- protocol version `1.0`;
- an interface URL ending in `/a2a`;
- bearer authentication; and
- streaming support.

## Send your first prompt

Use `message:stream` to receive Server-Sent Events while Idra works:

```bash
curl -N "$IDRA_URL/a2a/message:stream" \
  -H 'A2A-Version: 1.0' \
  -H "Authorization: Bearer $IDRA_TOKEN" \
  -H 'Content-Type: application/a2a+json' \
  -H 'Accept: text/event-stream' \
  --data '{
    "message": {
      "messageId": "request-1",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "Summarize the files in your workspace.",
          "mediaType": "text/plain"
        }
      ]
    }
  }'
```

Use a unique `messageId` for every message. A streamed run normally produces events in this order:

1. `task` — contains the new task `id` and conversation `contextId`;
2. `statusUpdate` — reports that the task is working;
3. one or more `artifactUpdate` events — contain Idra's text response; and
4. a terminal `statusUpdate` — reports `COMPLETED`, `FAILED`, or `CANCELED`.

Internal reasoning and tool details are not returned through A2A.

## Continue the same conversation

Copy the `contextId` from the first task event and include it in the next message:

```bash
curl -N "$IDRA_URL/a2a/message:stream" \
  -H 'A2A-Version: 1.0' \
  -H "Authorization: Bearer $IDRA_TOKEN" \
  -H 'Content-Type: application/a2a+json' \
  -H 'Accept: text/event-stream' \
  --data '{
    "message": {
      "messageId": "request-2",
      "contextId": "<context-id-from-first-task>",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "Now create a short summary file.",
          "mediaType": "text/plain"
        }
      ]
    }
  }'
```

Idra creates a new task for each message but reuses the conversation associated with the supplied `contextId`. Omit `contextId` to start a new conversation.

## Send without streaming

Use `message:send` when you prefer one JSON response instead of an SSE stream:

```bash
curl --fail-with-body "$IDRA_URL/a2a/message:send" \
  -H 'A2A-Version: 1.0' \
  -H "Authorization: Bearer $IDRA_TOKEN" \
  -H 'Content-Type: application/a2a+json' \
  --data '{
    "message": {
      "messageId": "request-3",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "List the files in the workspace.",
          "mediaType": "text/plain"
        }
      ]
    },
    "configuration": {
      "returnImmediately": false
    }
  }'
```

With `returnImmediately: false`, the request waits for the task to reach a terminal state. Set it to `true` to receive the initial task immediately and then poll or subscribe for updates.

## Manage tasks

All commands in this section require the A2A version and bearer token headers.

### List tasks

```bash
curl --fail-with-body "$IDRA_URL/a2a/tasks" \
  -H 'A2A-Version: 1.0' \
  -H "Authorization: Bearer $IDRA_TOKEN"
```

### Get one task

```bash
export TASK_ID='<task-id>'

curl --fail-with-body "$IDRA_URL/a2a/tasks/$TASK_ID" \
  -H 'A2A-Version: 1.0' \
  -H "Authorization: Bearer $IDRA_TOKEN"
```

### Subscribe to an active task

```bash
curl -N -X POST "$IDRA_URL/a2a/tasks/$TASK_ID:subscribe" \
  -H 'A2A-Version: 1.0' \
  -H "Authorization: Bearer $IDRA_TOKEN" \
  -H 'Accept: text/event-stream'
```

### Cancel an active task

```bash
curl --fail-with-body -X POST "$IDRA_URL/a2a/tasks/$TASK_ID:cancel" \
  -H 'A2A-Version: 1.0' \
  -H "Authorization: Bearer $IDRA_TOKEN"
```

Cancellation can fail if the task is already terminal or is no longer active.

## Use the official JavaScript client

Install the official A2A SDK in your client project:

```bash
npm install @a2a-js/sdk
```

Create a client that discovers Idra from its Agent Card and streams a prompt:

```js
import { randomUUID } from 'node:crypto';
import { Role } from '@a2a-js/sdk';
import { ClientFactory, RestTransportFactory } from '@a2a-js/sdk/client';

const baseUrl = process.env.IDRA_URL;
const token = process.env.IDRA_TOKEN;

if (!baseUrl || !token) {
	throw new Error('IDRA_URL and IDRA_TOKEN are required.');
}

const client = await new ClientFactory({
	transports: [new RestTransportFactory()],
}).createFromUrl(baseUrl);

const request = {
	tenant: '',
	message: {
		messageId: randomUUID(),
		contextId: '',
		taskId: '',
		role: Role.ROLE_USER,
		parts: [
			{
				content: { $case: 'text', value: 'Summarize the workspace.' },
				mediaType: 'text/plain',
				filename: '',
				metadata: {},
			},
		],
		metadata: {},
		extensions: [],
		referenceTaskIds: [],
	},
	configuration: undefined,
	metadata: {},
};

const options = {
	serviceParameters: {
		Authorization: `Bearer ${token}`,
	},
};

for await (const event of client.sendMessageStream(request, options)) {
	console.log(JSON.stringify(event, null, 2));
}
```

Pass the `contextId` from the first task in a later request to continue that conversation.

## Understand the workspace and limits

Idra's persistent workspace is `/data/workspace` inside the container. The A2A agent can use only three workspace-bound tools:

- `read` reads a workspace file;
- `write` creates or replaces a workspace file; and
- `edit` changes an existing workspace file.

Shell commands, MCP servers, subagents, administrative APIs, and configuration changes are unavailable through A2A. Put durable behavioral instructions in the workspace's `AGENTS.md` file by asking Idra to create or update it.

Message text is limited to 32 KiB. Only `text/plain` message parts are accepted. Terminal task records are retained for 30 days, and task/conversation data persists in the `idra-data` Docker volume.

## Stop, restart, or update Idra

Restart without deleting data:

```bash
docker compose restart
```

Stop the service while keeping its volume:

```bash
docker compose down
```

Update the checked-out source and recreate the container:

```bash
git pull --ff-only
docker compose up --build --wait -d
```

Do not use `docker compose down --volumes` unless you intend to delete the workspace, conversations, and task history.

## Troubleshooting

### Compose reports a missing variable

Every A2A and provider variable in `.env` must have a non-empty value. Check the file, then run:

```bash
docker compose config --quiet
```

### The server exits during startup

Inspect the container log:

```bash
docker compose logs app
```

Common causes are a missing provider setting, an A2A token shorter than 32 bytes, or an invalid `IDRA_PUBLIC_URL`. Production public URLs must use HTTPS and must not contain a path, query, credentials, or fragment.

### An A2A request returns `401 Unauthorized`

Confirm that the request uses `Authorization: Bearer <token>` and that the token exactly matches `IDRA_AGENT_TOKEN`.

### An A2A request returns a version error

Add `A2A-Version: 1.0`. Missing, `0.3`, and unsupported future versions are rejected.

### Opening the server URL returns `404 Not Found`

This is expected. Idra intentionally has no page at `/`. Use `/.well-known/agent-card.json` for discovery and `/a2a` for agent operations.

### Streaming arrives all at once

Disable response buffering in the HTTPS reverse proxy and increase its idle timeout. A2A streaming uses `text/event-stream`.

### The task fails after reaching `WORKING`

Check `docker compose logs app`, then verify the provider API key, provider ID, model ID, model availability, and provider account limits.
