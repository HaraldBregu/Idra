# cron add

`cron add` creates a new scheduled job.

## Tool Search Description

Use `cron add` to create a new reminder, delayed task, or recurring scheduled agent job after the timing and task are clear.

## Use For

- Creating reminders.
- Scheduling delayed agent work.
- Creating recurring jobs such as daily, weekly, or every-N-minutes tasks.

## Required Clarity

Before adding a job, the agent should know:

- what the job should do
- when it should run
- whether it runs once or repeats
- which timezone applies when a wall-clock time is used
- where the result should be delivered, if delivery matters

If any of these details would change the job meaning, ask a focused question before creating it.

## Inputs

The action should include a clear task and one schedule form:

- a one-time date and time
- a delay such as "in 2 hours"
- a recurrence such as daily, weekly, or every N minutes

Use a short job name when possible. Do not include credentials, API keys, or secrets in the job payload.

## Output

After creating the job, report:

- job id
- name or label
- schedule
- next run time, when available
- task summary

## Keep In Mind

Creating a schedule is an external commitment. If the user's wording is vague, confirm the schedule before adding the job.
