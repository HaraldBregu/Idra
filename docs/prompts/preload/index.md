# Preload API Prompt

Create and maintain the preload API as the only renderer-facing bridge to Electron and main-process services.

The preload API must expose stable, typed APIs through `contextBridge`. Do not expose `ipcRenderer` directly to the renderer. Do not create ad-hoc IPC calls in renderer code.

Use the typed IPC helpers for preload communication:

- `typedInvokeUnwrap` for request/response APIs.
- `typedSend` for fire-and-forget APIs.
- `typedOn` for event subscriptions.

Expose only these APIs on `window`:

- `win`
- `app`
- `agent`
- `realtimeTranscription`
- `cron`
- `heartbeat`
- `tasks`
- `monitor`
- `channels`
- `connectors`
- `skills`
- `policy`
- `store`

Keep preload API types in sync with the implementation. Shared request, response, event, and model types must live under `src/shared` so they can be reused by main, preload, and renderer code.

Do not place business logic in preload. Preload should validate and normalize only what is needed to safely bridge renderer calls to typed IPC channels.

## Window API

Expose `window.win` with:

- `minimize()`
- `maximize()`
- `close()`
- `popupMenu()`
- `isMaximized()`
- `isFullScreen()`
- `onMaximizeChange(callback)`
- `onFullScreenChange(callback)`

## App API

Expose `window.app` with:

- `openAppDataFolder()`
- `openUserDataFolder()`
- `openExternalUrl(url)`
- `setTrayEnabled(enabled)`
- `getTrayEnabled()`
- `getKeepAwakeEnabled()`
- `setKeepAwakeEnabled(enabled)`
- `getMicrophonePermission()`
- `setMicrophoneEnabled(enabled)`
- `requestMicrophonePermission()`
- `openSystemPreference(pane)`
- `getCameraPermission()`
- `setCameraEnabled(enabled)`
- `requestCameraPermission()`
- `setProviderApiKey(providerId, apiKey)`
- `isProviderApiKeySaved(providerId)`
- `getProviders()`
- `addProvider(input)`
- `getModels(provider)`
- `getAssistantOperator()`
- `saveAssistantOperator(provider, model)`
- `getSpeechToTextOperator()`
- `getSpeechToTextModels(provider)`
- `saveSpeechToTextOperator(provider, model)`
- `getTextToSpeechOperator()`
- `getTextToSpeechModels(provider)`
- `saveTextToSpeechOperator(provider, model)`
- `getImageCreatorOperator()`
- `getImageCreatorModels(provider)`
- `saveImageCreatorOperator(provider, model)`
- `getTextToVideoOperator()`
- `getTextToVideoModels(provider)`
- `saveTextToVideoOperator(provider, model)`
- `getMusicCreatorOperator()`
- `getMusicCreatorModels(provider)`
- `saveMusicCreatorOperator(provider, model)`
- `getAgentService()`
- `saveAgentService(provider, model)`
- `getSpeechTranscriberService()`
- `saveSpeechTranscriberService(provider, model)`

## Agent API

Expose `window.agent` with:

- `send(message, options)`
- `reset()`
- `cancel()`
- `getHistory()`
- `openHistoryFolder()`
- `listWorkspaceFiles()`
- `readWorkspaceFile(name)`
- `writeWorkspaceFile(name, content)`
- `onResponse(callback)`

## Realtime Transcription API

Expose `window.realtimeTranscription` with:

- `start(request)`
- `appendAudio(sessionId, audio)`
- `finish(sessionId)`
- `cancel(sessionId)`
- `onEvent(callback)`

## Cron API

Expose `window.cron` with:

- `list()`
- `listJobs(include)`
- `add(expression, data, options)`
- `remove(id)`
- `removeJob(id)`
- `createSchedule(request)`
- `updateSchedule(scheduleId, patch)`
- `pauseSchedule(scheduleId)`
- `resumeSchedule(scheduleId)`
- `deleteSchedule(scheduleId)`
- `listSchedules(filter)`
- `getSchedule(scheduleId)`
- `getScheduleEvents(scheduleId)`
- `getScheduleExecutions(scheduleId)`
- `getNextRuns(scheduleId, count)`
- `runNow(scheduleId)`
- `action(request)`
- `subscribeToSchedules(listener)`
- `subscribeToSchedule(scheduleId, listener)`

## Heartbeat API

Expose `window.heartbeat` with:

- `status()`
- `last()`
- `setEnabled(request)`
- `getTiming()`
- `updateTiming(request)`
- `systemEvent(request)`
- `request(request)`
- `onEvent(callback)`

## Tasks API

Expose `window.tasks` with:

- `start(request)`
- `list()`
- `get(id)`
- `cancel(id)`
- `onEvent(callback)`

## Monitor API

Expose `window.monitor` with:

- `snapshot(filter)`
- `list(filter)`
- `get(id)`
- `onEvent(callback)`

## Channels API

Expose `window.channels` with:

- `listCatalog()`
- `getConfig()`
- `getChannelConfig(type)`
- `saveChannelConfig(type, config)`
- `getStatus(type)`
- `getTelegramConfig()`
- `saveTelegramConfig(config)`
- `getTelegramStatus()`
- `startTelegram()`
- `stopTelegram()`
- `restartTelegram()`
- `onStatusChanged(callback)`

## Connectors API

Expose `window.connectors` with:

- `catalog()`
- `list()`
- `get(id)`
- `add(input)`
- `update(id, input)`
- `remove(id)`
- `enable(id)`
- `disable(id)`
- `test(id)`
- `reconnect(id)`
- `refreshTools(id)`
- `listTools(id)`
- `callTool(id, name, args, options)`
- `connectOAuth(id)`

## Skills API

Expose `window.skills` with:

- `list()`
- `importSkill()`
- `downloadSkill(id)`
- `delete(id)`
- `getRoot()`

## Policy API

Expose `window.policy` with:

- `get()`
- `set(policy)`

## Store API

Expose `window.store` with:

- `getProviders()`
- `setProviderApiKey(providerId, apiKey)`
- `isProviderApiKeySaved(providerId)`
- `addProvider(input)`
- `getKeepAwakeEnabled()`
- `setKeepAwakeEnabled(enabled)`
- `getAssistantOperator()`
- `saveAssistantOperator(provider, model)`
- `getSpeechToTextOperator()`
- `saveSpeechToTextOperator(provider, model)`
- `getTextToSpeechOperator()`
- `saveTextToSpeechOperator(provider, model)`
- `getImageCreatorOperator()`
- `saveImageCreatorOperator(provider, model)`
- `getTextToVideoOperator()`
- `saveTextToVideoOperator(provider, model)`
- `getMusicCreatorOperator()`
- `saveMusicCreatorOperator(provider, model)`
- `getAgentService()`
- `saveAgentService(provider, model)`
- `getSpeechTranscriberService()`
- `saveSpeechTranscriberService(provider, model)`

When implementing or updating preload, keep the structure minimal. Add APIs only when they are backed by typed shared IPC channels and a real main-process handler.
