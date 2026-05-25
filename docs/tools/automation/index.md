# Automation Tools

Automation tools manage Friday-owned future or recurring agent work. The current fixed automation tool is `cron`.

Do not use shell loops, system cron, host scheduler commands, or long-running processes to emulate scheduling. The `cron` tool is the agent-facing way to manage scheduled jobs.

## Tools

| Tool | Use it for |
| --- | --- |
| [cron](cron.md) | List, inspect, create, update, run, or remove Friday-owned scheduled jobs. |

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
- [Shell tools](../shell/index.md)
