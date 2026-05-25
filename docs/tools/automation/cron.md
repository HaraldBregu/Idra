# cron

`cron` manages Friday-owned scheduled agent jobs.

## Tool Search Description

Use `cron` to list, inspect, create, update, run, or remove Friday-owned reminders, delayed tasks, and recurring agent jobs.

## Use For

- Reminders.
- Delayed tasks.
- Recurring agent runs.
- User requests phrased as "schedule a task", "run every N minutes", "remind me later", or other future or repeating agent work.

## Do Not Use For

- Work that should start immediately. Use `exec` or a direct response instead.
- Shell sleep loops, host scheduler commands, or model-side timers.
- System cron, `crontab`, `launchctl`, `systemctl` timers, or `schtasks`.
- Storing secrets, credentials, or private tokens in a scheduled job payload.

## Actions

| Action | What it does |
| --- | --- |
| `list` | Shows scheduled jobs. |
| `get` | Inspects one scheduled job. |
| `add` | Creates a new scheduled job. |
| `update` | Changes an existing job. |
| `run` | Triggers a job immediately, outside its normal schedule. |
| `remove` | Deletes a scheduled job. |

## Keep In Mind

Before creating, changing, or deleting a schedule, make sure the schedule, task, and delivery expectation are clear. Do not use host schedulers to emulate this tool.
