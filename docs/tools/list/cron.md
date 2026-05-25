# cron

`cron` schedules future or recurring agent work.

## Use For

- Reminders.
- Delayed tasks.
- Recurring agent runs.

## Do Not Use For

- Work that should start immediately.
- Shell sleep loops, host scheduler commands, or model-side timers.
- Storing secrets in a scheduled payload.

## Keep In Mind

Scheduling is an external commitment. Make the timing, task, and delivery expectation clear before creating or changing a schedule.
