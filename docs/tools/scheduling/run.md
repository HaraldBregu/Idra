# cron run

`cron run` triggers a scheduled job immediately, outside its normal schedule.

## Tool Search Description

Use `cron run` to manually trigger an existing scheduled job right now, without waiting for its next scheduled time.

## Use For

- Testing a scheduled job before its first scheduled run.
- Running a job on demand when the user explicitly asks.
- Re-running a job that was missed or that failed.

## Do Not Use For

- Starting work that has no existing job. Use `exec` or a direct task instead.
- Replacing the schedule. The job continues to run on its normal schedule after a manual trigger.

## Inputs

The action needs the job id. If the user gives a name or description instead of an id, use `cron list` first to find the right job.

## Output

After triggering the job, report:

- job id
- name or label
- trigger result or confirmation
- next scheduled run time, when available

## When It Fails

If the trigger fails, report the job id and the error. Do not confirm the job ran until the tool confirms it. Check `cron get` to verify the job is still in a valid state.

## Keep In Mind

A manual run does not affect the job's schedule. The next scheduled run fires at its normal time regardless.
