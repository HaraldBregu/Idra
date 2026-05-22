# task

`task` starts an immediate background agent run.

## How It Is Used

- Used when work should begin now but continue separately from the current chat.
- Gives the user a visible task with progress, status, and a final result.
- Keeps the background agent run isolated from other work.

## Boundaries

- It is for approved agent background work, not arbitrary hidden execution.
- Future or recurring work should use `cron` instead.
