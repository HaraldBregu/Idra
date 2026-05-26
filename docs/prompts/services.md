# Services Prompt

## Services

### Policy

Service name: `PolicyService`

Main function: owns application policy rules and policy decisions so authorization, safety, access, and permission logic stay centralized.

Dependencies:

| Dependency      | Purpose                                        |
| --------------- | ---------------------------------------------- |
| None by default | Keep policy evaluation independent by default. |

### Cron

Service name: `CronService`

Main function: owns scheduled execution, including schedule creation, updates, deletion, lifecycle state, run history, and execution dispatch.

Dependencies:

| Dependency         | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `StoreService`     | Persist schedules, run history, and cron runtime state. |
| `TaskService`      | Start background tasks from scheduled runs.             |
| `PolicyService`    | Enforce schedule and execution policy.                  |
| Application logger | Log scheduling lifecycle, failures, and run results.    |

### Task

Service name: `TaskService`

Main function: owns background task execution, including task creation, task state, task history, cancellation, progress, and agent task execution.

Dependencies:

| Dependency         | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `StoreService`     | Persist task records in `task.json`.                 |
| `PolicyService`    | Enforce task admission and execution policy.         |
| Agent services     | Run agent-backed tasks.                              |
| Application logger | Log task lifecycle, failures, and execution results. |

### Tools

Service name: `ToolService`

Main function: owns tool registration and tool execution so tool definitions, policy checks, runtime execution, and results stay centralized.

Dependencies:

| Dependency         | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| `PolicyService`    | Authorize tool calls and file or system access.       |
| `CronService`      | Route cron tool actions through the scheduler.        |
| `StoreService`     | Read persisted settings needed by tools.              |
| Application logger | Log tool execution, validation failures, and results. |

### Store

Service name: `StoreService`

Main function: owns application persistence so durable app data is read and written through one service boundary.

Dependencies:

| Dependency      | Purpose                                             |
| --------------- | --------------------------------------------------- |
| None by default | Keep persistence independent from feature services. |
