# Scheduled Tasks

Scheduled tasks let Friday create agent work at a later time or on a recurring cadence.

## Functionality

- Persists managed schedule definitions in settings.
- Recovers schedules when the app starts.
- Validates schedule frequency, access policy, and payload shape.
- Creates background agent tasks when schedules become due.
- Records run state and delivery information for Friday cron jobs.

## Scheduler Types

| Scheduler | Functionality | How It Works |
| --- | --- | --- |
| Managed schedules | Persisted user-facing schedules. | Schedule records are stored in scheduler state, evaluated by the cron service, and converted into `agent.run` background tasks when due. |
| Friday cron jobs | Tool-facing scheduled jobs. | Jobs can run agent turns, system events, or wake requests and can route output through configured delivery targets. |
| Legacy cron jobs | Compatibility scheduler. | Existing node-cron style jobs remain supported while newer managed schedules and Friday cron jobs own the main scheduling flows. |

## Managed Schedule Flow

1. A schedule is created with a validated cadence and an allowed payload.
2. The schedule is persisted under scheduler state.
3. Startup recovery restores persisted schedules.
4. The cron service checks due schedules.
5. A due schedule creates a background `agent.run` task.
6. The background task resolves the current provider and model and runs normally.

Missed runs are handled during recovery according to scheduler policy so schedules can continue after the app was closed or asleep.

## Delivery And Safety

Scheduled payloads should contain the work request, not copied credentials. Provider settings are resolved at run time. Friday cron jobs can deliver output through the channel gateway or app event bus depending on the configured target.
