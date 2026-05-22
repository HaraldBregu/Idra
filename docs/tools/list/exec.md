# exec

`exec` runs an approved command in the workspace.

## How It Is Used

- Used for project checks such as tests, builds, formatting checks, and status
  commands.
- Helps verify whether a change actually works.
- Can run project utilities when the requested task depends on them.

## Boundaries

- It should not run destructive commands unless the user clearly asked for them.
- It should not replace purpose-built tools when a safer tool exists.
