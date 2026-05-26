# Services Prompt

## Services

## Dependency Summary

| Service         | Dependencies                                                      |
| --------------- | ----------------------------------------------------------------- |
| `PolicyService` | `StoreService` when policy data must be persisted                 |
| `CronService`   | `StoreService`, `TaskService`, `PolicyService`, application logger |
| `TaskService`   | `StoreService`, `PolicyService`, agent services, application logger |
| `ToolService`   | `PolicyService`, `CronService`, `StoreService`, application logger |
| `StoreService`  | None by default                                                   |

### Policy

Service name: `PolicyService`

PolicyService owns application policy rules and policy decisions. It should centralize policy behavior so other modules do not duplicate authorization, safety, access, or permission logic.

Function: it will store data about policies, policy rules, policy decisions, and policy evaluation results.

Dependencies:

| Dependency     | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `StoreService` | Persist policy data when persistence is required. |

### Cron

Service name: `CronService`

CronService owns scheduled execution. It should centralize schedule creation, updates, deletion, lifecycle state, run history, and execution dispatch so feature modules do not create their own schedulers.

Function: it will store data about cron schedules, schedule status, run timing, run history, failures, `providerId`, `modelId`, and scheduled targets.

Dependencies:

| Dependency         | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `StoreService`     | Persist schedules, run history, and cron runtime state. |
| `TaskService`      | Start background tasks from scheduled runs.       |
| `PolicyService`    | Enforce schedule and execution policy.            |
| Application logger | Log scheduling lifecycle, failures, and run results. |

### Task

Service name: `TaskService`

TaskService owns background task execution. It should centralize task creation, task state, task history, cancellation, progress, and agent task execution.

Function: it will store data about tasks in Electron Store through `task.json`, including task records, status, progress, results, errors, `providerId`, and `modelId`.

Dependencies:

| Dependency         | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `StoreService`     | Persist task records in `task.json`.             |
| `PolicyService`    | Enforce task admission and execution policy.      |
| Agent services     | Run agent-backed tasks.                           |
| Application logger | Log task lifecycle, failures, and execution results. |

### Tools

Service name: `ToolService`

ToolService owns tool registration and tool execution. It should centralize tool definitions, policy checks, runtime execution, and tool results so tools are not duplicated across feature modules.

Function: it will store data about registered tools, tool groups, tool schemas, tool metadata, tool execution requests, and tool execution results.

Dependencies:

| Dependency         | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `PolicyService`    | Authorize tool calls and file/system access.      |
| `CronService`      | Route cron tool actions through the scheduler.    |
| `StoreService`     | Read persisted settings needed by tools.          |
| Application logger | Log tool execution, validation failures, and results. |

### Store

Service name: `StoreService`

StoreService owns application persistence. It should centralize reads and writes for durable app data so modules do not create their own persistence formats or direct storage access.

Function: it will store data about settings, providers, models, agents, connectors, tasks, cron schedules, policies, and other persisted application configuration.

Dependencies:

| Dependency      | Purpose                                      |
| --------------- | -------------------------------------------- |
| None by default | Keep persistence independent from feature services. |
