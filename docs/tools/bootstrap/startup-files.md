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
