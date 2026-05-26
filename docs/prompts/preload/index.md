# Preload API Prompt

Refactor `src/preload` as the only renderer-facing bridge to Electron and main-process services. The preload layer must expose stable, typed APIs through `contextBridge`, must not expose `ipcRenderer` directly, and must not contain business logic. Use typed IPC helpers for communication, keep shared request and response types under `src/shared`, and add or update APIs only when they are backed by typed shared IPC channels and real main-process handlers.

## Window API

Expose window controls through `window.win`. This API is responsible only for renderer-safe window actions and window state subscriptions, such as minimizing, maximizing, closing, popup menu behavior, fullscreen state, and maximize state.

## App API

Expose application-level operations through `window.app`. This API handles app folders, external URLs, tray state, keep-awake state, system permissions, provider setup, model lookup, and configured model or agent operators.

## Agent API

Expose agent interaction through `window.agent`. This API handles sending messages, cancelling or resetting the active run, reading history, opening history storage, managing workspace files, and subscribing to agent response events.

## Realtime Transcription API

Expose realtime transcription through `window.realtimeTranscription`. This API starts transcription sessions, appends audio, finishes or cancels sessions, and streams transcription events back to the renderer.

## Cron API

Expose cron scheduling through `window.cron`. This API manages cron tasks, stored schedules, schedule events, execution history, next-run previews, immediate runs, and cron tool actions.

## Heartbeat API

Expose heartbeat behavior through `window.heartbeat`. This API reads heartbeat status, manages heartbeat timing and enabled state, reports system events, requests wake behavior, and streams heartbeat events.

## Tasks API

Expose background task behavior through `window.tasks`. This API starts tasks, lists active tasks, reads a task by id, cancels tasks, and streams task lifecycle events.

## Monitor API

Expose monitoring through `window.monitor`. This API reads monitor snapshots, lists monitor events, fetches a specific event, and streams new monitor records.

## Channels API

Expose channel configuration through `window.channels`. This API manages channel catalog data, channel configuration, channel status, Telegram configuration, Telegram lifecycle actions, and channel status events.

## Connectors API

Expose connector management through `window.connectors`. This API manages connector catalog data, connector CRUD operations, enable and disable state, tests, reconnects, tool refreshes, tool listing, tool calls, and OAuth connection flows.

## Skills API

Expose skill management through `window.skills`. This API lists skills, imports skills, downloads skills, deletes skills, and returns the skills root path.

## Policy API

Expose policy configuration through `window.policy`. This API reads and writes the application policy configuration used by services that need policy-controlled behavior.

## Store API

Expose store-backed settings through `window.store`. This API manages providers, provider API key state, keep-awake state, configured model operators, agent service configuration, and speech transcriber service configuration.

## Verify Implementation
