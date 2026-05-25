# cron update

`cron update` changes an existing scheduled job.

## Tool Search Description

Use `cron update` to change the schedule, task, name, or enabled state of an existing scheduled job.

## Use For

- Changing when a job runs.
- Updating what the agent should do when the job fires.
- Enabling or disabling a job without removing it.
- Renaming a job for clarity.

## Required Clarity

Before updating a job, confirm:

- the job id — use `cron list` first if needed
- exactly which field is changing
- the new value for that field
- whether the new schedule replaces or adjusts the existing one

If the user's wording is ambiguous, confirm the target job and the intended change before applying it.

## Inputs

The action needs the job id and at least one field to change:

- new schedule, delay, or recurrence
- new task or prompt
- new job name or label
- enabled or disabled state

Fields not included in the update should remain unchanged.

## Output

After updating the job, report:

- job id
- name or label
- what changed
- new schedule or next run time
- current enabled state

## Keep In Mind

Use `cron get` to confirm the full job state after a partial update when the result matters. An update is an external commitment — the changed schedule takes effect immediately.
