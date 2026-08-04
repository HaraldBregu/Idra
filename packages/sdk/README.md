# @friday/sdk

Typed client for the Friday desktop app API.

The same API in two shapes:

- **`connect()`** — for other apps. Friday serves its API over loopback HTTP, so any
  Node, browser, or Electron app can drive it.
- **named exports** — for code embedded in Friday (an extension window, or any renderer
  bundle), bound to the preload globals (`window.agent`, `window.image`, …).

The types are generated from the app's own contract (`src/shared/api_types.ts`), so the
package never drifts from the running app.

## Install

```sh
npm install @friday/sdk
```

## Usage from another app

Friday listens on `http://127.0.0.1:8765` and writes a bearer token to
`<userData>/sdk-token` (on macOS, `~/Library/Application Support/Friday/sdk-token`).
Read that token, and you have the whole API:

```ts
import { readFileSync } from 'node:fs';
import { connect } from '@friday/sdk';

const friday = connect({
	token: readFileSync('/Users/me/Library/Application Support/Friday/sdk-token', 'utf8').trim(),
});

await friday.ping(); // { name: 'friday', version: '1.0.0' }

const reply = await friday.agent.send('Summarize my day', {}, (event) => console.log(event));
const image = await friday.image.createImage({ prompt: 'a red bicycle' });

const off = friday.channels.onStatusChanged((event) => console.log(event.status));
```

Streaming callbacks (`agent.send`'s `onEvent`, `channels.onStatusChanged`) ride a
server-sent event stream that opens on first use; call `friday.close()` to drop it.
Pass `url` to reach a non-default port, and `fetch` to supply your own implementation.

## Usage inside Friday

```ts
import { agent, isFriday, models, type ImageRequest } from '@friday/sdk';

if (!isFriday()) throw new Error('Not running inside Friday');

const reply = await agent.send('Summarize my day', {}, (event) => console.log(event));

const request: ImageRequest = { prompt: 'a red bicycle' };
const result = await models.image.createImage(request);
```

## What's available

Both shapes expose the same namespaces, with the same method names and types as the app's
own preload API (`win` is embedded-only — it drives the window hosting your code):

| Export     | What it covers                                                                    |
| ---------- | --------------------------------------------------------------------------------- |
| `agent`    | Chat turns, sessions, provider/model, tool policy, health                         |
| `app`      | App data folder, external URLs, tray, theme, language, permissions, context menus |
| `channels` | Channel config, provider/model, Telegram lifecycle, status                        |
| `tasks`     | Scheduled jobs and their runtime                                                  |
| `mcp`      | MCP server config and OAuth                                                       |
| `models`   | Embedding, image, sound, text, transcription, video, and voice models             |
| `provider` | Provider credentials store                                                        |
| `recorder` | Microphone, camera, and screen capture                                            |
| `search`   | Search engine settings                                                            |
| `skills`   | Install, enable, load skills                                                      |
| `storage`  | Remote storage config, objects, sync/push/pull                                    |
| `extensions`  | Installed extensions                                                                 |
| `wiki`     | Wiki generation settings and runs                                                 |
| `win`      | Window controls for the hosting window                                            |

All request/result types are re-exported (`ImageRequest`, `AgentResponseEvent`,
`TaskSchedule`, `SkillInfo`, `StorageConfig`, `PermissionsSchema`, …), and `Uint8Array`
payloads (`storage.putObject`, `storage.getObject`) survive the remote hop intact.

A handful of members only make sense inside a window and are refused by `connect()` with
a descriptive error: `app.getPathForFile`, `app.show*ContextMenu`,
`transcribe.onRealtimeEvent`, and everything on `win`. Embedded imports likewise throw
when the app isn't there, so a missing host fails loudly instead of returning `undefined`.

## The API server

Friday starts it on `127.0.0.1:8765` at launch. Every request needs
`Authorization: Bearer <token>`; requests without it get a `401`, and only channels that
don't depend on a calling window are reachable.

| Setting                | Effect                                                  |
| ---------------------- | ------------------------------------------------------- |
| `FRIDAY_API_PORT`      | Change the port. `0` keeps the port closed.             |
| `<userData>/sdk-token` | The bearer token, created on first launch (mode `600`). |

Routes: `GET /health`, `POST /invoke` (`{ channel, args }`), `GET /events` (SSE).

## Development

Run these commands from the repository root:

```sh
npm ci
npm run sdk:build
npm run sdk:test
```

## Publishing

SDK releases use `sdk-v<version>` tags and npm trusted publishing. See the repository
[development and deployment guide](../../docs/DEVELOPMENT.md#release-the-sdk).
