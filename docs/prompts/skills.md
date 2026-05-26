# Skills Module Prompt

Create a skills module that is strictly implemented as a reusable service.

The skills module manages skills for the application. Any module that needs to list, import, download, delete, or resolve skills should use this service instead of creating its own skills logic.

Skills must be stored in a predefined directory. For now, store skills under `appdata/skills`.

The skills module has no service dependencies.

The skills module must use the application logger like the other services.

## Dependencies

- None. Keep skill management local to the skills service.

The skills module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the skills module isolated:

- Do not import internal skills files from outside the skills module.
- Do not expose internal skills files directly.
- Only `index` exposes the skills module.
- Consumers must depend on the exported skills service.
- Skills behavior must stay centralized inside the skills service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep skills-specific implementation types and files inside the skills module unless they are genuinely shared.

When changing the skills service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

The skills service should:

- List available skills.
- Import skills.
- Download skills.
- Delete skills.
- Resolve the skills root path.
- Log skill operations and failures through the application logger.

## Testing

Test skill listing, import, download, deletion, root path resolution, and logger behavior for failures. Tests should call the exported skills service and should not duplicate skills logic in feature modules.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
