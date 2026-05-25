# bootstrap

`bootstrap` creates or updates the known startup files needed to finish first-run setup.

## Tool Search Description

Use `bootstrap` after collecting the user's bootstrap preferences. The tool writes the required startup files in their canonical agent startup workspace; callers provide content, not file paths.

## Use For

- Creating or updating `IDENTITY.md`, `USER.md`, and `SOUL.md` during bootstrap.
- Optionally updating `HEARTBEAT.md` or `MEMORY.md` as part of setup.
- Completing bootstrap after the startup files are written.

## Do Not Use For

- General file edits.
- Writing arbitrary paths.
- Completing bootstrap before the user has provided enough setup details.

## Keep In Mind

The tool knows where the bootstrap files belong. Do not pass paths. Use the normal file tools for ordinary workspace files.
