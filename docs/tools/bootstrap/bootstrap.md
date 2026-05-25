# bootstrap

`bootstrap` creates or updates the known startup files needed to finish first-run setup.

## Tool Search Description

Use `bootstrap` after collecting the user's initial setup preferences. The tool creates the required bootstrap files in their canonical agent startup workspace; callers provide file content, not file paths.

## Use For

- Creating the first `IDENTITY.md`, `USER.md`, and `SOUL.md` files during bootstrap.
- Updating those same files when the user changes setup details before bootstrap is complete.
- Optionally updating `HEARTBEAT.md` or `MEMORY.md` as part of setup.
- Completing bootstrap after the startup files are written.

## Do Not Use For

- General file edits.
- Writing arbitrary paths.
- Completing bootstrap before the user has provided enough setup details.

## Inputs

Provide structured content for the known startup files. Do not provide filesystem paths or ask the tool to discover where the files live.

- `IDENTITY.md`: Friday's name, avatar, style, and useful identity metadata.
- `USER.md`: what to call the user, timezone, preferences, and durable notes.
- `SOUL.md`: tone, boundaries, and interaction style.
- `HEARTBEAT.md` or `MEMORY.md`: optional setup content when the user explicitly wants it.

## Expected Result

The tool writes the requested startup files to the canonical agent startup location and can mark bootstrap complete once the required files exist. If the tool reports failure, do not claim bootstrap is complete.

## Keep In Mind

The tool is only for initial startup-file creation and bootstrap completion. Use the normal file tools for ordinary workspace files.
