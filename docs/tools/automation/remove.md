# cron remove

`cron remove` deletes a scheduled job.

## Tool Search Description

Use `cron remove` to delete an existing scheduled job by id when the user clearly wants that reminder or recurring job removed.

## Use For

- Removing a reminder.
- Cancelling recurring scheduled work.
- Cleaning up a job that should no longer run.

## Inputs

The action needs the job id. If the user gives a description instead of an id, use `cron list` first and `cron get` when needed to confirm the target.

## Output

The result should confirm:

- which job was removed
- the removed job id
- the schedule or task summary, if available

## Keep In Mind

Removing a job is destructive because the schedule will stop running. Confirm the target when there is any ambiguity.
