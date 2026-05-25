# cron list

`cron list` shows scheduled jobs.

## Tool Search Description

Use `cron list` to show the scheduled jobs that already exist so the agent can review reminders, delayed work, or recurring runs.

## Use For

- Showing all scheduled jobs.
- Checking whether a reminder or recurring job already exists.
- Reviewing schedules before adding, removing, or changing jobs.

## Inputs

The action should need little or no input. When the system supports filters, use them only to narrow the result to the user's request.

## Output

The result should make each job easy to identify. It should show enough information to choose the right job for follow-up actions:

- job id
- name or label
- schedule or next run time
- status
- short task summary

## Keep In Mind

Use `cron list` before `cron get` or `cron remove` when the user describes a job but does not provide its exact id.
