# AppApi Preload Prompt

Expose application shell operations through `window.app`. `AppApi` is the renderer-safe bridge to app-level Electron capabilities and app configuration dependencies; it must not expose Electron, store, provider, or permission services directly.

## Expose

- App folders: `openAppDataFolder()` and `openUserDataFolder()`.
- External links: `openExternalUrl(url)`.
- Tray state: `setTrayEnabled(enabled)` and `getTrayEnabled()`.
- Keep-awake state: `getKeepAwakeEnabled()` and `setKeepAwakeEnabled(enabled)`.
- System permissions: microphone and camera get, set, request, and `openSystemPreference(pane)`.
- Provider setup: `setProviderApiKey`, `isProviderApiKeySaved`, `getProviders`, `addProvider`, and `getModels`.
- Operator setup: assistant, speech-to-text, text-to-speech, image, video, music, agent service, and speech transcriber getters and savers.

## Dependencies

- Shared types: `src/shared/providers.ts`, `src/shared/app-permissions.ts`, and `src/shared/agents/service.ts`.
- Channels: `AppChannels`, `ProviderChannels`, and `OperatorChannels` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `AppApi` in `src/preload/index.d.ts`.
- Preload implementation: `app` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/app-ipc.ts`.
- Main services: `store`, `appPermissions`, `powerSaveBlocker`, `userDataDirectory`, `logger`, and Electron `app`, `shell`, `systemPreferences`, and `BrowserWindow`.

## Rules

- Use `typedInvokeUnwrap` for all `AppApi` methods.
- Normalize and validate external URLs in main or shared code, not in preload.
- Keep filesystem opening, system permission prompts, power-save behavior, provider validation, and operator validation in main IPC or services.
- Do not add long-running domain behavior to `AppApi`; create or use a service-specific API instead.
- Prefer `window.store` for store-only settings when the renderer does not need app-shell behavior.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run `yarn typecheck:web` when renderer consumers change.
- Run focused main tests for provider, permission, or operator behavior changes.
