# Preloaded Local Tools

This folder documents Friday's preloaded local tools one by one.

## Shared Boundaries

- File-changing tools can create, update, copy, move, or delete files only inside
  the current workspace.
- Read and inspection tools may read permitted files outside the current
  workspace when the runtime allows it.
- `exec` can run approved scripts or commands inside or outside the current
  workspace when permissions allow it.
- Tools should stay focused on the user's request and avoid broad filesystem or
  process access that is not needed for the task.

## Tools

| Tool | How Friday uses it |
| --- | --- |
| [read](read.md) | Looks at files before answering questions or making changes. |
| [write](write.md) | Creates or replaces workspace files. |
| [edit](edit.md) | Changes a specific part of a workspace file. |
| [apply_patch](apply-patch.md) | Applies a planned set of workspace file changes. |
| [delete](delete.md) | Removes a workspace file. |
| [copy](copy.md) | Copies file content into a workspace path. |
| [move](move.md) | Renames or relocates a workspace file. |
| [inspect_file](inspect-file.md) | Checks file facts and previews when allowed. |
| [find](find.md) | Locates files by name or pattern. |
| [exec](exec.md) | Runs approved commands or scripts. |
| [process](process.md) | Reviews or stops background commands Friday started. |
| [web_fetch](web-fetch.md) | Reads text from a web address. |
| [cron](cron.md) | Schedules future or recurring agent work. |
| [task](task.md) | Starts an immediate background agent run. |
| [open_browser](open-browser.md) | Opens a web address in the user's browser. |
| [browser](browser.md) | Controls a managed browser session. |
