# Preload API Prompt

Use the preload layer as the only renderer-facing bridge to Electron and main-process services. Expose stable, typed APIs through `contextBridge`, do not expose raw IPC, and do not put business logic in preload.

Expose small APIs that delegate to the relevant main-process service through typed IPC. Do not expose service instances, storage objects, Electron objects, or implementation internals to the renderer.

## API Prompts

- Window API: expose window controls through `window.win`.
- App API: expose application shell operations through `window.app`.
- Agent API: expose agent interaction through `window.agent`.
- Cron API: expose cron scheduling through `window.cron`.
- Tasks API: expose background task behavior through `window.tasks`.
- SpeechToText API: expose batch transcription and dictation through `window.speechToText`.
- Channels API: expose channel configuration and lifecycle operations through `window.channels`.
- Connectors API: expose connector configuration, OAuth, tools, and tool calls through `window.connectors`.
- Skills API: expose skill management through `window.skills`.
- Policy API: expose policy configuration through `window.policy`.
- Store API: expose store-backed settings through `window.store`.

## Shared Rules

- Define a public renderer API before implementing the bridge.
- Keep request, response, and event data typed across the process boundary.
- Use named, typed channels instead of raw string channels in renderer-facing code.
- Register main-process handlers for every exposed command or query.
- Resolve behavior through real main-process services.
- Use invoke-style calls for request/response operations.
- Use send-style calls only for fire-and-forget operations.
- Use subscription helpers for events and always return unsubscribe functions.
- Keep validation, persistence, filesystem access, provider lookup, scheduling, and other business behavior in services or shared validators.
- Update renderer consumers to use the exposed `window` APIs only.
- Renderer code must not import Electron IPC or main-process modules.

## Adding or Changing an API

1. Decide which main-process service owns the behavior.
2. Define the public method shape and data contract.
3. Add or update the typed channel contract.
4. Add or update the preload interface.
5. Implement the preload method as a thin typed IPC call.
6. Add or update the main-process handler.
7. Delegate from the handler to the owning service.
8. Update renderer consumers.
9. Run the narrowest relevant typecheck or tests.
