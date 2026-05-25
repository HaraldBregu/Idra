# Scheduling

The `cron` tool manages scheduled agent work. Use it when the user wants something to happen later, repeat on a schedule, or be managed as a reminder.

Do not use shell loops, system cron, host scheduler commands, or long-running processes to emulate scheduling. The `cron` tool is the agent-facing way to manage scheduled jobs.

## Use For

- Reminders.
- Delayed tasks.
- Recurring agent runs.
- User requests phrased as "schedule a task", "run every N minutes", "remind me later", or other future or repeating agent work.

## Do Not Use For

- Work that should start immediately. Use `exec` or a direct task instead.
- Shell sleep loops, host scheduler commands, or model-side timers.
- System cron, `crontab`, `launchctl`, `systemctl` timers, or `schtasks`.
- Storing secrets, credentials, or private tokens in a scheduled job payload.

## Actions

| Action | What it does |
| --- | --- |
| [list](list.md) | Shows scheduled jobs. |
| [get](get.md) | Inspects one scheduled job. |
| [add](add.md) | Creates a new scheduled job. |
| [update](update.md) | Changes the schedule, task, name, or state of an existing job. |
| [run](run.md) | Triggers a job immediately, outside its normal schedule. |
| [remove](remove.md) | Deletes a scheduled job. |

## Shared Rules

- Use `cron` only for future or recurring work.
- Make the schedule, task, and expected delivery clear before creating a job.
- Do not store secrets or credentials in a scheduled job.
- Ask before creating, changing, or deleting a schedule when the user has not clearly authorized it.

## What Makes a Good Scheduled Job

- a clear, short job name
- a clear task description for the agent to run
- an exact time, recurrence, or delay
- a timezone when wall-clock time matters
- a stated delivery expectation — where the result should appear

## Related Docs

- [Tools](../index.md)
