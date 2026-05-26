# Cron Module Prompt

Create a cron module that is strictly implemented as a reusable service.

The cron module starts and manages cron schedules for the application. Any module that needs scheduled execution should use this service instead of creating its own scheduling logic.

The cron module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the cron module isolated:

- Do not import internal cron files from outside the cron module.
- Do not expose internal cron files directly.
- Only `index` exposes the cron module.
- Consumers must depend on the exported cron service.
- Scheduling behavior must stay centralized inside the cron service.

Types that need to be reused by other processes can be stored in a shared folder. Keep cron-specific implementation types inside the cron module unless they are genuinely shared.

## Dependencies

- None. Keep scheduled execution isolated from other services.

## Store Properties

Store each cron schedule with these properties:

- `id`: unique cron schedule identifier.
- `name`: human-readable schedule name.
- `description`: optional schedule description.
- `schedule`: cron expression or schedule configuration.
- `timezone`: timezone used to evaluate the schedule.
- `enabled`: whether the schedule is active.
- `status`: current schedule status.
- `providerId`: provider identifier loaded from the store.
- `modelId`: model identifier loaded from the store.
- `target`: job, tool, task, or agent that the schedule runs.
- `payload`: input data passed to the scheduled target.
- `createdAt`: creation timestamp.
- `updatedAt`: last update timestamp.
- `lastRunAt`: timestamp of the last run.
- `nextRunAt`: timestamp of the next planned run.
- `lastRunStatus`: status of the most recent run.
- `lastError`: most recent error message, if the run failed.
- `runCount`: total number of completed runs.
- `failureCount`: total number of failed runs.

The cron service should:

- Start cron schedules.
- Register scheduled jobs.
- Run jobs at the configured time or interval.
- Provide a reusable interface for other modules.
- Keep scheduling logic out of feature modules.
- Report job success or failure through the application's logging or reporting system.

## Logging

Use the application's logger for all operational reporting, including lifecycle events, state changes, policy decisions, validation failures, errors, and job execution results. Do not use console logging for module behavior.

## Testing

Test schedule creation, updates, deletion, pause, resume, next-run calculation, immediate execution, persisted schedule fields, and failure reporting. Tests should call the exported cron service and should not import internal cron files directly.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
