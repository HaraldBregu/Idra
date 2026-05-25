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
