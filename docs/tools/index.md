# Preloaded Tools

This page explains Friday's preloaded local tools in plain language. It covers
the default local tools from [AI tools](../ai/tools.md).

Friday does not expose every tool on every turn. It selects a small set based on
the user's request, safety rules, and the current run context.

## Preloaded Local Tools

| Tool | How Friday uses it |
| --- | --- |
| [read](read.md) | Looks at an existing workspace file before answering questions or making changes. |
| [write](write.md) | Creates a new file or replaces a file when the requested outcome needs new content saved. |
| [edit](edit.md) | Changes a specific part of an existing file after Friday has read it. |
| [apply_patch](apply-patch.md) | Applies a planned set of file changes when several edits need to land together. |
| [delete](delete.md) | Removes a file when the user asks for it or when Friday's own change makes the file obsolete. |
| [copy](copy.md) | Duplicates a file so existing content can be reused elsewhere. |
| [move](move.md) | Renames or relocates a file while preserving its contents. |
| [inspect_file](inspect-file.md) | Checks basic facts about a file, such as what kind of file it is and whether it can be previewed. |
| [find](find.md) | Locates files by name or pattern so Friday can work in the right part of the workspace. |
| [exec](exec.md) | Runs an approved workspace command for checks, builds, tests, or project utilities. |
| [process](process.md) | Reviews or stops background commands that Friday started earlier. |
| [web_fetch](web-fetch.md) | Reads text from a web address when the answer depends on external page content. |
| [cron](cron.md) | Saves future, delayed, recurring, or reminder-style agent work. |
| [task](task.md) | Starts an immediate background agent run that should not block the current app session. |
| [open_browser](open-browser.md) | Opens a safe web address in the user's browser. |
| [browser](browser.md) | Uses a managed browser for navigation, screenshots, and page interaction. |
