# Tools Module Prompt

Create a tools module that exposes reusable tools through a clear service boundary.

The tools module provides application tools that can be used by other processes. Tool behavior must stay centralized inside the tools module instead of being duplicated across feature modules.

The tools module can depend on `PolicyService`, `CronService`, and `SkillsService`:

- Use `PolicyService` to evaluate whether a tool action is allowed.
- Use `CronService` when a tool needs scheduled execution.
- Use `SkillsService` when a tool needs to use skills.
- Do not reimplement policy checks or cron scheduling inside individual tools.

## Dependencies

- `PolicyService`: evaluate whether tool actions are allowed.
- `CronService`: run scheduling behavior for cron tools.
- `SkillsService`: provide skill access for tools that use skills.

Keep the tools module isolated:

- Do not import internal tool files from outside the tools module.
- Do not expose internal tool files directly.
- Only `index` exposes the tools module.
- Consumers must depend on the exported tools service or exported tool registry.
- Tool behavior must stay centralized inside the tools module.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep tool-specific implementation types and files inside the tools module unless they are genuinely shared.

When changing the tools service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

Delete unrelated, obsolete, or conflicting modules, files, and types when they are replaced by the tools module. Refactor existing tool logic so it uses the centralized tools module instead of leaving duplicate implementations in place.

## Filesystem Tools

Add filesystem tools as a dedicated group:

- Create filesystem tool.
- Read filesystem tool.
- Update filesystem tool.
- Delete filesystem tool.
- List filesystem tool.
- Move filesystem tool.
- Copy filesystem tool.
- Search filesystem tool.

Filesystem tools should use `PolicyService` before reading, writing, moving, copying, searching, or deleting files.

## Cron Tools

Add cron tools as a dedicated group:

- Create cron tool.
- Read cron tool.
- Update cron tool.
- Delete cron tool.
- List cron tool.
- Start cron tool.
- Stop cron tool.
- Run cron tool.

Cron tools should use `PolicyService` before creating, reading, updating, deleting, listing, starting, stopping, or running cron jobs.

Cron tools should use `CronService` for all scheduling behavior. They must not start schedules directly or duplicate cron logic.

## Logging

Use the application's logger for all operational reporting, including lifecycle events, state changes, policy decisions, validation failures, errors, and tool execution results. Do not use console logging for module behavior.

## Testing

Test each filesystem tool and cron tool through the exported tools service. Tests should cover policy checks, cron delegation, successful execution, failure handling, logging, and removal or refactoring of duplicate tool implementations.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
