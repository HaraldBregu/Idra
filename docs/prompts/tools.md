# Tools Module Prompt

Create a tools module that exposes reusable tools through a clear service boundary.

The tools module provides application tools that can be used by other processes. Tool behavior must stay centralized inside the tools module instead of being duplicated across feature modules.

The tools module can depend on `PolicyService` and `CronService`:

- Use `PolicyService` to evaluate whether a tool action is allowed.
- Use `CronService` when a tool needs scheduled execution.
- Do not reimplement policy checks or cron scheduling inside individual tools.

Keep the tools module isolated:

- Do not import internal tool files from outside the tools module.
- Do not expose internal tool files directly.
- Only `index` exposes the tools module.
- Consumers must depend on the exported tools service or exported tool registry.
- Tool behavior must stay centralized inside the tools module.

Types that need to be reused by other processes can be stored in a shared folder. Keep tool-specific implementation types inside the tools module unless they are genuinely shared.

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

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
