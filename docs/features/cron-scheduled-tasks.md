# Cron Scheduled Tasks

Cron lets Friday create recurring or delayed work and route the result through the agent, task manager, heartbeat, app event bus, or channels.

## Scheduler Types

| Scheduler | Status | How It Works |
| --- | --- | --- |
| Managed schedules | Runtime implemented | Persisted schedule records are stored in settings, recovered at startup, evaluated by the cron scheduler, and converted into background agent tasks when due. |
| Friday cron jobs | Runtime implemented | Tool-facing jobs can run agent turns, background tasks, system events, wake requests, and delivery actions. |
| Legacy cron jobs | Runtime implemented | Compatibility support remains for direct node-cron style jobs. |

## Functionality

- Validates cron expressions and schedule payloads.
- Persists managed schedules in the store.
- Restores schedules after app restart.
- Applies schedule access policy and high-frequency guards.
- Computes next runs and exposes schedule run history.
- Handles missed runs during recovery according to scheduler policy.
- Creates background `agent.run` tasks for due managed schedules.
- Delivers Friday cron output through the event bus or channel registry.
- Can wake heartbeat or enqueue heartbeat system events.

Automatic cron execution is enabled unless disabled by environment configuration such as `SKIP_CRON=1` or `CRON_ENABLED=false`.

## Source

- `src/main/cron`
- `src/shared/cron.ts`
- `src/main/tools/local/cron.ts`
- `src/renderer/src/pages/settings/pages/cron`
- Existing docs: `docs/tasks/scheduled/index.md`, `docs/tools/list/cron.md`

