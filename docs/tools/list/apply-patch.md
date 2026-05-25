# apply_patch

`apply_patch` applies a planned set of related file changes.

## Tool Search Description

Use `apply_patch` to apply a focused patch containing several related workspace file changes.

## Use For

- Multiple edits that should land together.
- Changes that are easier to review as one patch.
- Removing or updating related code or docs.

## Do Not Use For

- Broad cleanup the user did not ask for.
- Changes to files the agent has not inspected.

## Keep In Mind

A patch should be focused. Every changed line should trace back to the user's request.
