# A2A client integration

This guide describes how an external client authenticates with Idra and invokes the agent over A2A 1.0 HTTP+JSON.

## Credential boundaries

An A2A client needs only:

- Idra's public URL;
- its registered client ID;
- its own Ed25519 private key; and
- a short-lived OAuth access token obtained with that key.

The client must never receive or send the model provider API key, `IDRA_ADMIN_TOKEN`, or `IDRA_CONFIG_KEY`. Idra uses the provider API key internally when invoking the configured model. The administrator token is used only by a trusted operator to register or revoke clients.

## Interaction flow

1. The client fetches the public Agent Card.
2. An administrator registers the client's Ed25519 public key once.
3. The client signs a one-time `private_key_jwt` assertion with its private key.
4. The client exchanges the assertion for a five-minute OAuth bearer token.
5. The client sends A2A requests with that bearer token and `A2A-Version: 1.0`.
6. The client obtains a new token when the current token expires.

## 1. Discover Idra

Start with the Agent Card rather than hard-coding A2A or OAuth endpoints:

```http
GET /.well-known/agent-card.json
```

The card advertises:

- the A2A interface URL, normally `https://agent.example.com/a2a`;
- protocol binding `HTTP+JSON` and protocol version `1.0`;
- streaming support;
- OAuth metadata; and
- required scope `a2a.invoke`.

The related public discovery documents are:

```text
/.well-known/oauth-authorization-server
/.well-known/oauth-protected-resource/a2a
/.well-known/jwks.json
```

Validate that discovered URLs use the expected HTTPS origin before sending credentials.

## 2. Register the client

Generate an Ed25519 key pair in the client environment. Keep the private key there and provide only the public JWK to a trusted Idra administrator.

The administrator registers it with:

```http
POST /config/clients
Authorization: Bearer <IDRA_ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "calling-agent",
  "publicKeyJwk": { "kty": "OKP", "crv": "Ed25519", "x": "..." }
}
```

The response includes the `clientId` needed during token acquisition. This registration endpoint is administrative: an A2A client must not retain the administrator token.

## 3. Obtain an access token

Create a JWT signed with the registered Ed25519 private key. Its claims must include:

| Field | Value |
| --- | --- |
| `alg` | `EdDSA` |
| `typ` | `JWT` |
| `iss` | Registered client ID |
| `sub` | Registered client ID |
| `aud` | Discovered token endpoint |
| `iat` | Current Unix time |
| `exp` | No more than five minutes after `iat` |
| `jti` | A new unique value for every assertion |

Exchange the assertion at the discovered token endpoint, currently `/a2a/oauth/token`:

```http
POST /a2a/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=<client-id>&
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
client_assertion=<signed-jwt>&
scope=a2a.invoke&
resource=https%3A%2F%2Fagent.example.com%2Fa2a
```

A successful response is:

```json
{
  "access_token": "<signed-access-token>",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "a2a.invoke"
}
```

Assertions cannot be replayed. Generate a new assertion with a new `jti` for each token request. Keep access tokens in memory and send them only over HTTPS.

## 4. Send a message

Every A2A operation requires both authentication and the protocol-version header:

```http
Authorization: Bearer <oauth-access-token>
A2A-Version: 1.0
```

For a streamed response:

```bash
curl -N 'https://agent.example.com/a2a/message:stream' \
  -H 'Authorization: Bearer <oauth-access-token>' \
  -H 'A2A-Version: 1.0' \
  -H 'Content-Type: application/a2a+json' \
  -H 'Accept: text/event-stream' \
  --data '{
    "message": {
      "messageId": "unique-message-id",
      "role": "ROLE_USER",
      "parts": [{
        "text": "Summarize the workspace.",
        "mediaType": "text/plain"
      }]
    }
  }'
```

The stream normally contains:

1. a `task` event with the task ID and `contextId`;
2. a working `statusUpdate`;
3. one or more `artifactUpdate` events containing output; and
4. a completed, failed, or canceled terminal `statusUpdate`.

Use a unique `messageId` for every message.

For a non-streaming call, send the same message to `/a2a/message:send`. Set `configuration.returnImmediately` to `false` to wait for a terminal response or `true` to receive the initial task and poll it later.

## 5. Continue a conversation

Take the `contextId` from the first task event and include it in the next message:

```json
{
  "message": {
    "messageId": "another-unique-message-id",
    "contextId": "<context-id>",
    "role": "ROLE_USER",
    "parts": [{
      "text": "Now save that summary to a file.",
      "mediaType": "text/plain"
    }]
  }
}
```

Omit `contextId` to begin a new conversation. Tasks and conversations are isolated by registered client identity.

## 6. Manage tasks

Use the same bearer token and version header for task operations:

```text
GET  /a2a/tasks
GET  /a2a/tasks/{taskId}
POST /a2a/tasks/{taskId}:subscribe
POST /a2a/tasks/{taskId}:cancel
```

Subscription responses use Server-Sent Events. A task ID does not grant access by itself; Idra checks that the authenticated client owns the task.

## Errors and token renewal

- `401 Unauthorized`: acquire a fresh token and confirm the client is still registered.
- `invalid_client`: verify the client ID, signing key, assertion audience, clock, and unique `jti`.
- `429 Too Many Requests`: wait for the duration in `Retry-After`.
- Version error: include `A2A-Version: 1.0`.
- Failed task: ask the administrator to verify Idra's provider configuration; the client should not attempt to supply a provider API key.

There is no refresh token. Request a new access token with a newly signed assertion before or after the current five-minute token expires.

For deployment, administration, runnable key-generation examples, and the official JavaScript SDK example, see [Using Idra over A2A](USAGE.md).
