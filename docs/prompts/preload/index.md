# Preload API Prompt

Refactor `src/preload` as the only renderer-facing bridge to Electron and main-process services. The preload layer must expose stable, typed APIs through `contextBridge`, must not expose `ipcRenderer` directly, and must not contain business logic. Use typed IPC helpers for communication, keep shared request and response types under `src/shared`, and add or update APIs only when they are backed by typed shared IPC channels and real main-process handlers.

Do not expose service instances to the renderer. Expose small APIs that delegate to the relevant main-process service through typed IPC.

## API Prompts

- [Window API](window.md): expose window controls through `window.win`.
- [App API](app.md): expose application shell operations through `window.app`.
- [Agent API](agent.md): expose agent interaction through `window.agent`.
- [Cron API](cron.md): expose cron scheduling through `window.cron`.
- [Tasks API](tasks.md): expose background task behavior through `window.tasks`.
- [Skills API](skills.md): expose skill management through `window.skills`.
- [Policy API](policy.md): expose policy configuration through `window.policy`.
- [Store API](store.md): expose store-backed settings through `window.store`.

## Shared Rules

- Define the public renderer API in `src/preload/index.d.ts`.
- Implement the public API in `src/preload/index.ts`.
- Define channel names and channel maps in `src/shared/ipc-channels/index.ts`.
- Define cross-process request and response types under `src/shared`.
- Register main-process handlers under `src/main/ipc`.
- Resolve real service dependencies from `MainServiceContainer`.
- Use `typedInvokeUnwrap` for request/response operations, `typedSend` for fire-and-forget operations, and `typedOn` for event subscriptions.
- Return unsubscribe functions from subscriptions.
- Keep validation, persistence, filesystem access, provider lookup, scheduling, and other business behavior in main-process services or shared validators.
- Update renderer consumers to use `window.<api>` only; renderer code must not import Electron IPC or main-process modules.

## Adding or Changing a Preload API

1. Confirm which service owns the behavior.
2. Add or update shared types when data crosses the process boundary.
3. Add or update the typed IPC channel and channel map.
4. Add or update the preload interface and implementation.
5. Add or update the main IPC handler and delegate to the service.
6. Update renderer consumers.
7. Run the narrowest relevant typecheck or tests.
