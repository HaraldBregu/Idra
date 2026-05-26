# Services Prompt

## Services

## Dependency Map

| Service         | Depends On                                                        | Used By                                      |
| --------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| `PolicyService` | `StoreService` when policy data must be persisted                 | Services that evaluate permissions or rules  |
| `CronService`   | `StoreService`, `TaskService`, `PolicyService`, application logger | Services that need scheduled execution       |
| `TaskService`   | `StoreService`, `PolicyService`, agent services, application logger | Services that need background execution      |
| `ToolService`   | `PolicyService`, `CronService`, `StoreService`, application logger | Services that need tool execution            |
| `StoreService`  | Avoid feature-service dependencies unless required                | Services that need durable application state |

### Policy

Service name: `PolicyService`

PolicyService owns application policy rules and policy decisions. It should centralize policy behavior so other modules do not duplicate authorization, safety, access, or permission logic.

Function: it will store data about policies, policy rules, policy decisions, and policy evaluation results.

| Dependency Direction | Service          | Purpose                                      |
| -------------------- | ---------------- | -------------------------------------------- |
| Depends on           | `StoreService`   | Persist policy data when persistence is required. |
| Used by              | Any service      | Evaluate permissions, enforce rules, and make policy decisions. |

### Cron

Service name: `CronService`

CronService owns scheduled execution. It should centralize schedule creation, updates, deletion, lifecycle state, run history, and execution dispatch so feature modules do not create their own schedulers.

Function: it will store data about cron schedules, schedule status, run timing, run history, failures, `providerId`, `modelId`, and scheduled targets.

| Dependency Direction | Service          | Purpose                                      |
| -------------------- | ---------------- | -------------------------------------------- |
| Depends on           | `StoreService`   | Persist schedules, run history, and cron runtime state. |
| Depends on           | `TaskService`    | Start background tasks from scheduled runs.  |
| Depends on           | `PolicyService`  | Enforce schedule and execution policy.       |
| Depends on           | Application logger | Log scheduling lifecycle, failures, and run results. |
| Used by              | Any service      | Register, update, stop, or run scheduled work. |

### Task

Service name: `TaskService`

TaskService owns background task execution. It should centralize task creation, task state, task history, cancellation, progress, and agent task execution.

Function: it will store data about tasks in Electron Store through `task.json`, including task records, status, progress, results, errors, `providerId`, and `modelId`.

| Dependency Direction | Service          | Purpose                                      |
| -------------------- | ---------------- | -------------------------------------------- |
| Depends on           | `StoreService`   | Persist task records in `task.json`.         |
| Depends on           | `PolicyService`  | Enforce task admission and execution policy. |
| Depends on           | Agent services   | Run agent-backed tasks.                      |
| Depends on           | Application logger | Log task lifecycle, failures, and execution results. |
| Used by              | Any service      | Create, inspect, cancel, or run background tasks. |

### Tools

Service name: `ToolService`

ToolService owns tool registration and tool execution. It should centralize tool definitions, policy checks, runtime execution, and tool results so tools are not duplicated across feature modules.

Function: it will store data about registered tools, tool groups, tool schemas, tool metadata, tool execution requests, and tool execution results.

| Dependency Direction | Service          | Purpose                                      |
| -------------------- | ---------------- | -------------------------------------------- |
| Depends on           | `PolicyService`  | Authorize tool calls and file/system access. |
| Depends on           | `CronService`    | Route cron tool actions through the scheduler. |
| Depends on           | `StoreService`   | Read persisted settings needed by tools.     |
| Depends on           | Application logger | Log tool execution, validation failures, and results. |
| Used by              | Any service      | Execute reusable tools through one service boundary. |

### Store

Service name: `StoreService`

StoreService owns application persistence. It should centralize reads and writes for durable app data so modules do not create their own persistence formats or direct storage access.

Function: it will store data about settings, providers, models, agents, connectors, tasks, cron schedules, policies, and other persisted application configuration.

| Dependency Direction | Service          | Purpose                                      |
| -------------------- | ---------------- | -------------------------------------------- |
| Depends on           | None by default  | Keep persistence independent from feature services. |
| Used by              | Any service      | Read and write durable application state.    |
