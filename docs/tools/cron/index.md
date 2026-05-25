# Cron Tool

The `cron` tool manages scheduled agent work. Use it when the user wants something to happen later, repeat on a schedule, or be managed as a reminder.

Do not use shell loops, system cron, host scheduler commands, or long-running processes to emulate scheduling. The `cron` tool is the agent-facing way to manage scheduled jobs.

## Actions

| Action | What it does |
| --- | --- |
| [list](list.md) | Shows scheduled jobs. |
| [get](get.md) | Inspects one scheduled job. |
| [add](add.md) | Creates a new scheduled job. |
| [remove](remove.md) | Deletes a scheduled job. |

## Shared Rules

- Use `cron` only for future or recurring work.
- Use immediate task or normal tool execution for work that should start now.
- Make the schedule, task, and expected delivery clear before creating a job.
- Do not store secrets, credentials, or private tokens in a scheduled job.
- Ask before creating, changing, or deleting a schedule when the user has not clearly authorized it.

## Good Cron Jobs

A good scheduled job has:

- a clear job name
- a clear task for the agent to run
- an exact time, recurrence, or delay
- a timezone when wall-clock time matters
- a delivery expectation, such as where the result should appear

## Related Docs

- [cron local tool card](../list/cron.md)
- [Tools](../index.md)
