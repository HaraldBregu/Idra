# StoreApi Preload Prompt

Expose store-backed settings through `window.store`. `StoreApi` is the renderer-safe bridge to `StoreService`; it must not expose the store instance, raw persisted state, API keys, or Electron store internals.

## Expose

- Providers: `getProviders()`, `setProviderApiKey(providerId, apiKey)`, `isProviderApiKeySaved(providerId)`, and `addProvider(input)`.
- Keep awake: `getKeepAwakeEnabled()` and `setKeepAwakeEnabled(enabled)`.
- Operators: assistant, speech-to-text, text-to-speech, image, video, and music getters and savers.
- Service selections: `getAgentService()`, `saveAgentService(provider, model)`, `getSpeechTranscriberService()`, and `saveSpeechTranscriberService(provider, model)`.

## Dependencies

- Shared types: `src/shared/providers.ts` and `src/shared/agents/service.ts`.
- Channels: `StoreChannels` and `StoreInvokeChannelMap` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `StoreApi` in `src/preload/index.d.ts`.
- Preload implementation: `store` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/store-ipc.ts`.
- Main services: `store`, `powerSaveBlocker`, and `logger`.

## Rules

- Use `typedInvokeUnwrap` for every method.
- Return public provider data only; never return saved API keys.
- Keep provider id, URL, API key, model, and operator validation in main IPC, shared validators, or `StoreService`.
- Keep power-save side effects behind the main-process `powerSaveBlocker`.
- Do not expose generic get/set methods for arbitrary store keys.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run store service or IPC tests when persistence behavior changes.
- Run `yarn typecheck:web` when renderer consumers change.
