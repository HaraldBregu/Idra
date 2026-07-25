# @friday/sdk

Typed client for the Friday desktop app API.

Friday exposes its IPC API to the renderer as globals (`window.agent`, `window.image`, …)
through the Electron preload. This package is a typed, lazily-bound view over those
globals, so an app embedded in Friday — a widget window, or any renderer bundle — can
import the API instead of reaching into `window` untyped.

The types are generated from the app's own contract (`src/shared/api_types.ts`), so the
package never drifts from the running app.

## Install

```sh
npm install @friday/sdk
```

## Usage

```ts
import { agent, image, isFriday, type ImageRequest } from '@friday/sdk';

if (!isFriday()) throw new Error('Not running inside Friday');

const reply = await agent.send('Summarize my day', {}, (event) => console.log(event));

const request: ImageRequest = { prompt: 'a red bicycle' };
const result = await image.createImage(request);
```

Anything the app exposes is available, keeping the same shape as the app's own preload API:

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
