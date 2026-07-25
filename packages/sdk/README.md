# @friday/sdk

Typed client for the Friday desktop app API.

The same API in two shapes:

- **`connect()`** — for other apps. Friday serves its API over loopback HTTP, so any
  Node, browser, or Electron app can drive it.
- **named exports** — for code embedded in Friday (a widget window, or any renderer
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
import { agent, image, isFriday, type ImageRequest } from '@friday/sdk';

if (!isFriday()) throw new Error('Not running inside Friday');

const reply = await agent.send('Summarize my day', {}, (event) => console.log(event));

const request: ImageRequest = { prompt: 'a red bicycle' };
const result = await image.createImage(request);
```

## What's available

Both shapes expose the same namespaces, with the same method names and types as the app's
own preload API (`win` is embedded-only — it drives the window hosting your code):

| Export       | What it covers                                                                    |
| ------------ | --------------------------------------------------------------------------------- |
| `agent`      | Chat turns, sessions, provider/model, tool policy, health                         |
| `app`        | App data folder, external URLs, tray, theme, language, permissions, context menus |
| `channels`   | Channel config, provider/model, Telegram lifecycle, status                        |
| `cron`       | Scheduled jobs and their runtime                                                  |
| `image`      | Image generation and its provider/model                                           |
| `library`    | Generated file library                                                            |
| `mcp`        | MCP server config and OAuth                                                       |
| `provider`   | Provider credentials store                                                        |
| `search`     | Search engine settings                                                            |
| `skills`     | Install, enable, load skills                                                      |
| `sound`      | Sound generation and listing                                                      |
| `storage`    | Remote storage config, objects, sync/push/pull                                    |
| `text`       | Text generation and its provider/model                                            |
| `transcribe` | Batch and realtime speech-to-text                                                 |
| `video`      | Video generation and its provider/model                                           |
| `voice`      | Text-to-speech synthesis                                                          |
| `widgets`    | Installed widgets                                                                 |
| `win`        | Window controls for the hosting window                                            |

`isFriday()` reports whether the host globals are present. Every other export throws a
descriptive error when the app isn't there, so a missing host fails loudly instead of
silently returning `undefined`.

All request/result types are re-exported (`ImageRequest`, `AgentResponseEvent`,
`CronSchedule`, `SkillInfo`, `StorageConfig`, `PermissionsSchema`, …).

## Requirements

The runtime only works where Friday's preload globals exist — inside a Friday window.
Outside of it the package still type-checks, and `isFriday()` returns `false`.

## Development

```sh
npm run build   # tsc from the app's shared types into dist/
npm run smoke   # build, then a stubbed-globals self-check
```

## Publishing

`publishConfig.access` is already `public`, and `prepublishOnly` rebuilds `dist/`:

```sh
npm publish
```
