# Speech-To-Text Module Prompt

Create a speech-to-text module that is strictly implemented as a reusable service.

The speech-to-text module manages transcription for the application. Any module that needs to transcribe audio, handle dictation, or process speech input should use this service instead of creating its own speech-to-text logic.

The speech-to-text module depends on `StoreService`.

## Dependencies

- `StoreService`: read configured speech-to-text provider, model, and module settings.

The speech-to-text module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the speech-to-text module isolated:

- Do not import internal speech-to-text files from outside the speech-to-text module.
- Do not expose internal speech-to-text files directly.
- Only `index` exposes the speech-to-text module.
- Consumers must depend on the exported speech-to-text service.
- Speech-to-text behavior must stay centralized inside the speech-to-text service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep speech-to-text-specific implementation types and files inside the speech-to-text module unless they are genuinely shared.

When changing the speech-to-text service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

The speech-to-text service should:

- Create speech-to-text sessions.
- Read speech-to-text session state.
- Append audio to active speech-to-text sessions.
- Finish speech-to-text sessions.
- Cancel speech-to-text sessions when they are no longer needed.
- Transcribe recorded audio through a reusable service interface.
- Use `StoreService` to resolve the active speech-to-text provider and model.
- Keep speech-to-text logic out of feature modules.

## Implementation Requirements

When implementing or changing this module:

- Respect the declared dependencies. Do not add service dependencies or bypass `StoreService` unless the existing project requirements explicitly require it.
- Refactor the owning service directly instead of layering patch-style fixes. Keep public behavior centralized in the service.
- Put types, constants, schemas, channels, or helper files under `src/shared` when they are used across the main process, preload, renderer, or multiple services. Keep module-only files inside the module.
- Implement or update tests for the behavior being changed, including failure paths and dependency interactions.
- Verify the implementation with the narrowest relevant typecheck, lint, test, or docs check before finishing.
- Delete files, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test speech-to-text session creation, state reads, audio appends, finishing, cancellation, transcription success, missing or invalid settings, provider failure behavior, and dependency access through `StoreService`. Tests should call the exported speech-to-text service and should not import internal speech-to-text files directly.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
