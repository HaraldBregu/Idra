# cron get

`cron get` inspects one scheduled job.

## Tool Search Description

Use `cron get` to inspect the details of one scheduled job by id before explaining, changing, running, or removing it.

## Use For

- Looking up one job by id.
- Confirming the exact schedule and task.
- Checking job status before a destructive action.
- Explaining what a scheduled job will do.

## Inputs

The action needs the job id. If the user does not know the id, use `cron list` first to find the right job.

## Output

The result should explain the job clearly:

- job id
- name or label
- schedule, delay, or recurrence
- timezone, when relevant
- enabled or disabled state
- task the agent will run
- next run time, when available
- recent run information, when available

## Keep In Mind

Use `cron get` before removing a job if there is any chance of deleting the wrong schedule.
