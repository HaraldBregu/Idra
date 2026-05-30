# CronApi Preload Prompt

Expose cron scheduling through `window.cron`. This API is the renderer-safe bridge to `CronService`; it must not expose scheduler internals, task runners, queue state, storage objects, or service instances directly.

## Expose

- List legacy cron tasks.
- Add a legacy cron task.
- Remove a legacy cron task.
- Create a managed schedule.
- Update a managed schedule.
- Pause, resume, and delete a managed schedule.
- List schedules with an optional filter.
- Read one schedule.
- Read schedule events.
- Read schedule executions.
- Preview next runs.
- Trigger a schedule immediately.
- Subscribe to all schedule events.
- Subscribe to events for one schedule.

## Dependencies

- Shared cron request, schedule, task, event, execution, and preview types.
- Typed cron invoke channels for commands and queries.
- Typed cron event channels for schedule events.
- A main-process handler that delegates to `CronService`.
- Main-process actor and permission handling for UI-initiated schedule operations.
- Main-process event broadcasting from the cron service.

## Rules

- Use invoke-style calls for schedule commands and queries.
- Use subscription-style calls for schedule events.
- Filter schedule-specific subscriptions only by event identity in preload.
- Keep authorization, scheduling policy, execution history, persistence, and task execution in `CronService`.
- Validate cron task data and schedule request shapes outside preload.
- Do not let renderer code provide privileged actor permissions directly.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run cron service or IPC tests when schedule behavior changes.
- Run renderer checks when renderer consumers change.
