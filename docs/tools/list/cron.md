# cron

`cron` manages scheduled jobs through the Gateway-owned scheduler.

## How It Is Used

- Used for reminders, future runs, delayed work, and recurring agent tasks.
- Supports ten actions: `status`, `list`, `get`, `add`, `update`, `remove`,
  `run`, `runs`, `wake`.
- Cron expressions are written in the supplied timezone as local wall-clock time;
  Friday does not convert them to UTC first.
- Uses `jobId` as the canonical job identifier (`id` is accepted as a
  compatibility alias).
- Can capture a window of recent transcript messages as context for the scheduled
  run (`contextMessages` field, 1–10 messages).
- Infers a delivery target from the current session's delivery context when one
  is present.
- Prefers isolated `agentTurn` jobs unless the user explicitly asks for
  main-session `systemEvent` injection.

## Boundaries

- It does not directly change files.
- It is for future or repeating work, not work that should start now; use `task`
  for immediate background work.
- Do not emulate scheduling with sleep loops, shell loops, long-running process
  polling, or model-side timers.
- Any agent run started from a schedule must follow the same workspace file
  mutation boundaries as normal tool use.
- It must not store secrets or provider credentials in a schedule payload.
- This tool is owner-only; it is not available to sub-agents.
