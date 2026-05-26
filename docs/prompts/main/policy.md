# Policy Module Prompt

Create a policy module that is strictly implemented as a reusable service.

The policy module manages policy logic for the application. Any module that needs to evaluate, apply, or enforce policies should use this service instead of creating its own policy logic.

Use appropriate design patterns and follow the project's software standards when implementing or refactoring the policy module. Patterns should solve real service-boundary, lifecycle, dependency, authorization, integration, or validation problems; do not add decorative abstractions.

The policy module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the policy module isolated:

- Do not import internal policy files from outside the policy module.
- Do not expose internal policy files directly.
- Only `index` exposes the policy module.
- Consumers must depend on the exported policy service.
- Policy behavior must stay centralized inside the policy service.

Types that need to be reused by other services or processes must be stored under `src/shared`. Keep policy-specific implementation types inside the policy module unless they are genuinely shared.

When changing the policy service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

## Dependencies

- None. Keep policy evaluation isolated from other services.

The policy service should:

- Register policy rules.
- Evaluate policies through a reusable interface.
- Keep policy logic out of feature modules.
- Provide consistent policy decisions across the application.
- Report policy evaluation errors through the application's logging or reporting system.

## Logging

Use the application's logger for all operational reporting, including lifecycle events, state changes, policy decisions, validation failures, errors, and policy evaluation results. Do not use console logging for module behavior.

## Implementation Requirements

When implementing or changing this module:

- Respect the declared dependencies. Do not add service dependencies unless the existing project requirements explicitly require it.
- Use appropriate design patterns when they solve real service-boundary, lifecycle, dependency, authorization, integration, or validation problems. Prefer the smallest existing project pattern that fits, and do not add decorative abstractions.
- Follow the project's software standards for code quality, security, reliability, performance, maintainability, logging, error handling, and testing.
- Refactor the owning service directly instead of layering patch-style fixes. Keep public behavior centralized in the service.
- Put types, constants, schemas, channels, or helper files under `src/shared` when they are used across the main process, preload, renderer, or multiple services. Keep module-only files inside the module.
- Implement or update tests for the behavior being changed, including failure paths and dependency interactions.
- Verify the implementation with the narrowest relevant typecheck, lint, test, or docs check before finishing.
- Delete files, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test allowed decisions, denied decisions, invalid policy input, policy updates, policy evaluation errors, and logging for failures. Tests should call the exported policy service and should not duplicate policy logic in feature modules.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
