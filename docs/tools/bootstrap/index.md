# Bootstrap Tools

Bootstrap tools create or update the known startup files needed to finish first-run setup. They are bootstrap-only controls, not part of the preloaded local tool catalog.

## Tools

| Tool | Use it for |
| --- | --- |
| [bootstrap](bootstrap.md) | Create or update the required startup files and complete bootstrap. |
| [startup_files](startup-files.md) | List, read, write, or complete individual allowlisted startup files. |

## Shared Rules

- Use these tools only for first-run startup setup.
- Provide content, not filesystem paths, when using `bootstrap`.
- Do not claim bootstrap is complete until the tool reports success and `BOOTSTRAP.md` is completed.
- Use normal file tools for ordinary workspace files.

## Related Docs

- [Tools](../index.md)
*** Add File: docs/tools/bootstrap/bootstrap.md
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
*** Add File: docs/tools/bootstrap/startup-files.md
# startup_files

`startup_files` manages individual allowlisted agent startup files during bootstrap.

## Tool Search Description

Use `startup_files` to list, read, write, or complete individual allowlisted startup files in the current agent startup workspace.

## Use For

- Listing startup files during bootstrap.
- Reading a specific startup file.
- Writing a specific allowlisted startup file.
- Completing bootstrap after the required startup files are updated.

## Do Not Use For

- General workspace file edits.
- Arbitrary filesystem paths.
- Startup files outside the allowlist.

## Actions

| Action | What it does |
| --- | --- |
| `list` | Lists known startup files and their status. |
| `read` | Reads one allowlisted startup file. |
| `write` | Writes one allowlisted startup file. |
| `complete_bootstrap` | Removes `BOOTSTRAP.md` and records setup completion. |

## Keep In Mind

Prefer `bootstrap` when the goal is to write all required setup files together. Use `startup_files` for targeted fallback edits.
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
*** Add File: docs/tools/bootstrap/startup-files.md
# startup_files

`startup_files` manages individual allowlisted agent startup files during bootstrap.

## Tool Search Description

Use `startup_files` to list, read, write, or complete individual allowlisted startup files in the current agent startup workspace.

## Use For

- Listing startup files during bootstrap.
- Reading a specific startup file.
- Writing a specific allowlisted startup file.
- Completing bootstrap after the required startup files are updated.

## Do Not Use For

- General workspace file edits.
- Arbitrary filesystem paths.
- Startup files outside the allowlist.

## Actions

| Action | What it does |
| --- | --- |
| `list` | Lists known startup files and their status. |
| `read` | Reads one allowlisted startup file. |
| `write` | Writes one allowlisted startup file. |
| `complete_bootstrap` | Removes `BOOTSTRAP.md` and records setup completion. |

## Keep In Mind

Prefer `bootstrap` when the goal is to write all required setup files together. Use `startup_files` for targeted fallback edits.
