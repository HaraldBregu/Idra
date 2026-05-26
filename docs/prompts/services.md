# Services Prompt

## Services

### Policy

Name service: `PolicyService`

PolicyService owns application policy rules and policy decisions. It should centralize policy behavior so other modules do not duplicate authorization, safety, access, or permission logic.

Function: it will store data about policies, policy rules, policy decisions, and policy evaluation results.

Dependencies: any service that needs to evaluate permissions or enforce rules can depend on `PolicyService`. `PolicyService` can depend on `StoreService` when policy data must be persisted.

### Cron

Name service: `CronService`

CronService owns scheduled execution. It should centralize schedule creation, updates, deletion, lifecycle state, run history, and execution dispatch so feature modules do not create their own schedulers.

Function: it will store data about cron schedules, schedule status, run timing, run history, failures, `providerId`, `modelId`, and scheduled targets.

Dependencies: services that need scheduled execution can depend on `CronService`. `CronService` can depend on `StoreService`, `TaskService`, `PolicyService`, and the application logger.

### Task

Name service: `TaskService`

TaskService owns background task execution. It should centralize task creation, task state, task history, cancellation, progress, and agent task execution.

Function: it will store data about tasks in Electron Store through `task.json`, including task records, status, progress, results, errors, `providerId`, and `modelId`.

Dependencies: services that need background execution can depend on `TaskService`. `TaskService` can depend on `StoreService`, `PolicyService`, agent execution services, and the application logger.

### Tools

Name service: `ToolService`

ToolService owns tool registration and tool execution. It should centralize tool definitions, policy checks, runtime execution, and tool results so tools are not duplicated across feature modules.

Function: it will store data about registered tools, tool groups, tool schemas, tool metadata, tool execution requests, and tool execution results.

Dependencies: services that need tool execution can depend on `ToolService`. `ToolService` can depend on `PolicyService`, `CronService`, `StoreService`, and the application logger.

### Store

Name service: `StoreService`

StoreService owns application persistence. It should centralize reads and writes for durable app data so modules do not create their own persistence formats or direct storage access.

Function: it will store data about settings, providers, models, agents, connectors, tasks, cron schedules, policies, and other persisted application configuration.

Dependencies: other services can depend on `StoreService` for persistence. `StoreService` should avoid depending on feature services unless the existing project conventions require it.
