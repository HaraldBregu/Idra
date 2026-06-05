# Speech-To-Text Module Prompt

Create a speech-to-text module that is strictly implemented as a reusable service.

The speech-to-text module manages transcription for the application. Any module that needs to transcribe audio, handle dictation, or process speech input should use this service instead of creating its own speech-to-text logic.

Use appropriate design patterns and follow the project's software standards when implementing or refactoring the speech-to-text module. Patterns should solve real service-boundary, lifecycle, dependency, provider, integration, or validation problems; do not add decorative abstractions.

The speech-to-text module depends on `StoreService`.

## Dependencies

- `StoreService`: read configured speech-to-text provider, model, and module settings.

The speech-to-text module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the speech-to-text module isolated:

- Do not import internal speech-to-text implementation details from outside the speech-to-text module.
- Do not expose internal speech-to-text implementation details directly.
- Expose the speech-to-text module only through its public service boundary.
- Consumers must depend on the exported speech-to-text service.
- Speech-to-text behavior must stay centralized inside the speech-to-text service.

Types or implementation details that need to be reused by other services or processes must be stored in the shared project folder so they can be used everywhere. Keep speech-to-text-specific implementation details inside the speech-to-text module unless they are genuinely shared.

When implementing or changing the speech-to-text service, always implement the requested behavior directly in the service and refactor the service directly. Do not layer patch-style fixes, compatibility shims, transitional APIs, dual implementations, migrations, or migration paths. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

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

- Always implement logging for new or changed operational behavior using the application logger. Do not use console logging for module behavior.
- Respect the declared dependencies. Do not add service dependencies or bypass `StoreService` unless the existing project requirements explicitly require it.
- Use appropriate design patterns when they solve real service-boundary, lifecycle, dependency, provider, integration, or validation problems. Prefer the smallest existing project pattern that fits, and do not add decorative abstractions.
- Follow the project's software standards for code quality, security, reliability, performance, maintainability, logging, error handling, and testing.
- Implement the requested behavior directly in the owning service and refactor that service directly. Keep public behavior centralized in the service.
- Do not create migrations, migration paths, compatibility shims, transitional APIs, or duplicate implementations.
- Put types, constants, schemas, channels, or helper code in the shared project folder when they are used across the main process, preload, renderer, or multiple services. Keep module-only implementation details inside the module.
- Implement or update tests for the behavior being changed, including failure paths and dependency interactions.
- Verify the implementation with the narrowest relevant typecheck, lint, test, or docs check before finishing.
- Delete code, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test speech-to-text session creation, state reads, audio appends, finishing, cancellation, transcription success, missing or invalid settings, provider failure behavior, and dependency access through `StoreService`. Tests should call the exported speech-to-text service through its public service boundary.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra structure unless they are required by the existing project conventions.
