# task

`task` starts immediate background agent work.

## Use For

- Work that should start now but continue separately.
- Long-running work that needs progress and a final result.

## Do Not Use For

- Future or recurring work.
- Hidden execution the user did not ask for.

## Keep In Mind

Background work should follow the same permissions, context, and verification rules as a normal agent run.
