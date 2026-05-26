# Services Prompt

Create application modules as reusable services with clear boundaries.

Every service module must stay isolated:

- Do not import internal service files from outside the service module.
- Do not expose internal service files directly.
- Only `index` exposes the service module.
- Consumers must depend on the exported service.
- Shared types or files used by multiple processes must live under `src/shared`.
- Delete obsolete or conflicting modules, files, and types when a service replaces them.
- Refactor duplicate logic so behavior stays centralized in the owning service.

Services should use the application logger for operations and failures. The logger is not counted as a service dependency.

For each service, add tests for public behavior, declared dependencies, error handling, logging, and module-boundary isolation. Tests should call exported services instead of internal service files.

## Services

### Policy

Service name: `PolicyService`

Main function: owns application policy rules and policy decisions so authorization, safety, access, and permission logic stay centralized.

Dependencies:

| Dependency | Purpose                          |
| ---------- | -------------------------------- |
| None       | Keep policy evaluation isolated. |

### Cron

Service name: `CronService`

Main function: owns scheduled execution, including schedule creation, updates, deletion, lifecycle state, run history, and execution dispatch.

Store cron schedules with `id`, `name`, `description`, `schedule`, `timezone`, `enabled`, `status`, `providerId`, `modelId`, `target`, `payload`, `createdAt`, `updatedAt`, `lastRunAt`, `nextRunAt`, `lastRunStatus`, `lastError`, `runCount`, and `failureCount`.

Dependencies:

| Dependency | Purpose                                            |
| ---------- | -------------------------------------------------- |
| None       | Keep scheduled execution isolated from services. |

### Task

Service name: `TaskService`

Main function: owns background tasks that run in the background and are stored in RAM. Tasks can run agents as part of task execution.

Each task should have one dependency.

Dependencies:

| Dependency | Purpose                                               |
| ---------- | ----------------------------------------------------- |
| None       | Keep background task execution isolated from services. |

### Tools

Service name: `ToolService`

Main function: owns tool registration and tool execution so tool definitions, policy checks, runtime execution, and results stay centralized.

Filesystem tools include create, read, update, delete, list, move, copy, and search.

Cron tools include create, read, update, delete, list, start, stop, and run.

Dependencies:

| Dependency      | Purpose                                      |
| --------------- | -------------------------------------------- |
| `PolicyService` | Authorize tool calls and file or system use. |
| `CronService`   | Route cron tool actions through scheduling.  |

### Agent

Service name: `AgentService`

Main function: owns agent execution, agent run state, and tool-enabled agent behavior.

Dependencies:

| Dependency    | Purpose                              |
| ------------- | ------------------------------------ |
| `ToolService` | Allow agents to call registered tools. |

### Skills

Service name: `SkillsService`

Main function: owns skill listing, importing, downloading, deletion, and root path resolution.

Dependencies:

| Dependency | Purpose                     |
| ---------- | --------------------------- |
| None       | Keep skill management local. |

### Store

Service name: `StoreService`

Main function: owns application persistence so durable app data is read and written through one service boundary.

Dependencies:

| Dependency | Purpose                                      |
| ---------- | -------------------------------------------- |
| None       | Keep persistence independent from services. |
