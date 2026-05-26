# StoreApi Preload Prompt

Expose store-backed settings through `window.store`. This API is the renderer-safe bridge to `StoreService`; it must not expose the store instance, raw persisted state, API keys, or storage internals.

## Expose

- List public providers.
- Retrieve every documented store-backed property the renderer needs to inspect.
- Retrieve assistant settings.
- Retrieve speech-to-text settings.
- Retrieve text-to-speech settings.
- Retrieve image creator settings.
- Retrieve text-to-video settings.
- Retrieve text-to-sound settings.
- Retrieve cron settings.
- Retrieve task settings.
- Retrieve agent routing and agent definition settings.
- Retrieve heartbeat settings.
- Retrieve connector settings.
- Retrieve channel settings.
- Save a provider API key without returning it.
- Check whether a provider API key is saved.
- Add a valid provider.
- Read and update keep-awake state.
- Read and save assistant operator selection.
- Read and save speech-to-text operator selection.
- Read and save text-to-speech operator selection.
- Read and save image creator operator selection.
- Read and save text-to-video operator selection.
- Read and save music creator operator selection.
- Read and save agent-service selection.
- Read and save speech-transcriber selection.

## Dependencies

- Shared provider, model, operator, and service-selection types.
- Typed store invoke channels.
- A main-process handler that delegates to `StoreService`.
- Main-process power-save behavior for keep-awake settings.
- Main-process validation for providers, models, and operator selections.

## Rules

- Use invoke-style calls for every store operation.
- Return public provider data only; never return saved API keys.
- Treat the store documentation as the canonical list of store-backed properties to expose.
- Add a typed read path for each documented property before renderer code depends on it.
- Keep property-specific writes scoped to the owning property.
- Keep provider id, URL, API key, model, and operator validation outside preload.
- Keep power-save side effects in the main process.
- Do not expose generic get/set methods for arbitrary store keys.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run store service or IPC tests when persistence behavior changes.
- Run renderer checks when renderer consumers change.
