# cron

`cron` schedules agent work for later.

## How It Is Used

- Used for reminders, future runs, delayed work, and recurring agent tasks.
- Saves the timing rules and the safe instruction for what Friday should do when
  the schedule fires.
- Creates a normal background task when the scheduled time arrives.

## Boundaries

- It is for future or repeating work, not work that should start now.
- It should not store secrets or provider credentials in the schedule.
