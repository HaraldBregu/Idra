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

The cron service should:

- Start cron schedules.
- Register scheduled jobs.
- Run jobs at the configured time or interval.
- Provide a reusable interface for other modules.
- Keep scheduling logic out of feature modules.
- Report job success or failure through the application's logging or reporting system.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
