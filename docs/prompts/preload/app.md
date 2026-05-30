# AppApi Preload Prompt

Expose application shell operations through `window.app`. This API is the renderer-safe bridge to app-level Electron capabilities and app configuration dependencies; it must not expose Electron, storage, provider, or permission services directly.

## Expose

- Open app-managed folders from the main process.
- Open validated external URLs.
- Read and update tray visibility state.
- Read and update keep-awake state.
- Read, update, and request microphone permission state.
- Read, update, and request camera permission state.
- Open known system preference panes.
- Configure provider API keys without returning secrets.
- Read public provider data and add valid providers.
- Look up supported models for a provider.
- Read and save configured operator selections.
- Read and save agent-service and speech-transcriber selections.

## Dependencies

- Shared provider, app-permission, model, and operator types.
- Typed app, provider, and operator channel contracts.
- A main-process handler that owns app-shell behavior.
- Main-process access to app folders, external URL opening, system permissions, tray state, and power-save behavior.
- Store-backed provider and operator configuration.

## Rules

- Use invoke-style calls for all app API methods.
- Normalize and validate external URLs outside preload.
- Keep filesystem opening, permission prompts, power-save behavior, provider validation, and operator validation in the main process.
- Do not add long-running domain behavior to `AppApi`; expose that through a service-specific API.
- Prefer `window.store` for store-only settings when no app-shell behavior is required.
- Never return provider secrets to the renderer.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run renderer checks when renderer consumers change.
- Run focused main-process tests for provider, permission, or operator behavior changes.
