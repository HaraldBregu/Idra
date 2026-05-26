# TTS Module Prompt

Create a TTS module that is strictly implemented as a reusable service.

The TTS module manages text-to-speech generation for the application. Any module that needs to synthesize spoken audio from text should use this service instead of creating its own TTS logic.

The TTS module depends on `StoreService`.

## Dependencies

- `StoreService`: read configured text-to-speech provider, model, and module settings.

The TTS module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the TTS module isolated:

- Do not import internal TTS files from outside the TTS module.
- Do not expose internal TTS files directly.
- Only `index` exposes the TTS module.
- Consumers must depend on the exported TTS service.
- TTS behavior must stay centralized inside the TTS service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep TTS-specific implementation types and files inside the TTS module unless they are genuinely shared.

When changing the TTS service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

The TTS service should:

- Resolve the active text-to-speech provider and model through `StoreService`.
- Validate text-to-speech settings before synthesis.
- Generate speech audio through a reusable service interface.
- Keep provider-specific request details out of feature modules.
- Return renderer-safe audio output and metadata.
- Keep text-to-speech generation logic out of feature modules.

## Implementation Requirements

When implementing or changing this module:

- Respect the declared dependencies. Do not add service dependencies or bypass `StoreService` unless the existing project requirements explicitly require it.
- Refactor the owning service directly instead of layering patch-style fixes. Keep public behavior centralized in the service.
- Put types, constants, schemas, channels, or helper files under `src/shared` when they are used across the main process, preload, renderer, or multiple services. Keep module-only files inside the module.
- Implement or update tests for the behavior being changed, including failure paths and dependency interactions.
- Verify the implementation with the narrowest relevant typecheck, lint, test, or docs check before finishing.
- Delete files, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test text-to-speech setting resolution through `StoreService`, synthesis success, missing or invalid settings, provider failure behavior, and renderer-safe output serialization. Tests should call the exported TTS service and should not import internal TTS files directly.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
