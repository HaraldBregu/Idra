# Connectors Module Prompt

Create a connectors module that is strictly implemented as a reusable service.

The connectors module owns connector persistence for the application. Any module that needs durable connector settings should use this service instead of reading or writing Electron Store directly.

Use appropriate design patterns and follow the project's software standards when implementing or refactoring the connectors module. Patterns should solve real service-boundary, lifecycle, dependency, persistence, integration, or validation problems; do not add decorative abstractions.

The connectors module has no service dependencies.

## Dependencies

- None. Keep connector persistence independent from other services.

The connectors module must use the application logger like the other services.

The connectors module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the connectors module isolated:

- Do not import internal connector files from outside the connectors module.
- Do not expose internal connector files directly.
- Only `index` exposes the connectors module.
- Consumers must depend on the exported connectors service.
- Connector behavior must stay centralized inside the connectors service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep connector-specific implementation types and files inside the connectors module unless they are genuinely shared.

When changing the connectors service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

## Store Backend

Use Electron Store with the store name `connectors` so connector data is stored outside the general settings store.

## Connector Settings

Store connector settings by connector key:

- `google_gmail`
- `google_calendar`
- `google_drive`
- `microsoft_teams`
- `outlook_calendar`
- `outlook_email`
- `sharepoint`
- `dropbox`

The connectors service should:

- Read connector settings.
- Update connector settings.
- Delete connector settings.
- List configured connectors.
- Validate connector settings before writing them.
- Normalize connector settings before returning them.
- Keep connector persistence out of `StoreService` and feature modules.
- Report connector persistence failures through the application logger.

## Logging

Use the application's logger for all operational reporting, including reads, writes, validation failures, normalization failures, and persistence errors. Do not use console logging for module behavior.

## Implementation Requirements

When implementing or changing this module:

- Always implement logging for new or changed operational behavior using the application logger. Do not use console logging for module behavior.
- Respect the declared dependencies. Do not add service dependencies unless the existing project requirements explicitly require it.
- Use appropriate design patterns when they solve real service-boundary, lifecycle, dependency, persistence, integration, or validation problems. Prefer the smallest existing project pattern that fits, and do not add decorative abstractions.
- Follow the project's software standards for code quality, security, reliability, performance, maintainability, logging, error handling, and testing.
- Refactor the owning service directly instead of layering patch-style fixes. Keep public behavior centralized in the service.
- Put connector types, connector keys, schemas, constants, channels, or helper files under `src/shared` when they are used across the main process, preload, renderer, or multiple services. Keep module-only files inside the connectors module.
- Implement or update tests for the behavior being changed, including success paths, failure paths, persistence errors, validation, normalization, and logger behavior.
- Run the focused connectors tests after implementation. If shared contracts or call sites changed, also run the narrowest relevant typecheck or integration test.
- Verify the implementation before finishing by confirming the tests pass and the public service behavior matches this prompt.
- Delete files, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test connector reads, writes, deletion, listing, validation, normalization, persistence errors, and logger behavior for failures. Tests should call the exported connectors service and should not import internal connector files directly.

Every connectors implementation change must include a verification step in the final result that names the test, typecheck, lint, or docs check that was run.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
