# Plugin Tools

Plugin tools are capabilities supplied by enabled plugins.

## How They Are Used

- Used when the current run includes plugin-provided actions.
- Let Friday extend its tool surface without making every plugin action part of
  the default local registry.
- Appear only when policy and runtime context include them.

## Boundaries

- They are not always available.
- Friday should still apply the same selection, safety, and audit expectations
  used for other tools.
