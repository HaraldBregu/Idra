# cron

`cron` schedules future or recurring agent work.

## Tool Search Description

Use `cron` to create, inspect, update, run, or remove future and recurring scheduled agent work.

## Use For

- Reminders.
- Delayed tasks.
- Recurring agent runs.
- User requests phrased as "schedule a task", "run every N minutes", "remind
  me later", or other future/repeating agent work.

## Do Not Use For

- Work that should start immediately.
- Shell sleep loops, host scheduler commands, or model-side timers.
- System cron, `crontab`, `launchctl`, `systemctl` timers, or `schtasks`.
- Storing secrets in a scheduled payload.

## Keep In Mind

Scheduling is an external commitment. Make the timing, task, and delivery expectation clear before creating or changing a schedule.
