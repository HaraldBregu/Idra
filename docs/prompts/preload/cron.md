# CronApi Preload Prompt

Expose cron scheduling through `window.cron`. `CronApi` is the renderer-safe bridge to `CronService`; it must not expose the cron service, scheduler internals, task runners, or store objects directly.

## Expose

- Legacy task access: `list()`, `add(expression, data, options)`, and `remove(id)`.
- Managed schedules: `createSchedule(request)`, `updateSchedule(scheduleId, patch)`, `pauseSchedule(scheduleId)`, `resumeSchedule(scheduleId)`, and `deleteSchedule(scheduleId)`.
- Schedule reads: `listSchedules(filter)`, `getSchedule(scheduleId)`, `getScheduleEvents(scheduleId)`, `getScheduleExecutions(scheduleId)`, and `getNextRuns(scheduleId, count)`.
- Manual execution: `runNow(scheduleId)`.
- Events: `subscribeToSchedules(listener)` and `subscribeToSchedule(scheduleId, listener)`.

## Dependencies

- Shared types and validators: `src/shared/cron.ts`.
- Channels: `CronChannels`, `CronInvokeChannelMap`, and `CronEventChannelMap` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `CronApi` in `src/preload/index.d.ts`.
- Preload implementation: `cron` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/cron-ipc.ts`.
- Main services: `cron`, `logger`, and `eventBus`.

## Rules

- Use `typedInvokeUnwrap` for schedule commands and queries.
- Use `typedOn(CronChannels.event, listener)` for schedule events.
- Filter schedule-specific subscriptions in preload only by event identity; keep authorization, scheduling policy, execution history, and persistence in `CronService`.
- Validate cron task data and schedule request shapes in shared validators or main IPC.
- Do not let renderer code provide privileged actor permissions directly; main IPC must create the UI actor context.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run cron service or IPC tests when schedule behavior changes.
- Run `yarn typecheck:web` when renderer consumers change.
