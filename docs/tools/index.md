# Tools

This page explains Friday's local tools and tool-search support in plain
language. It covers the default local tools from [AI tools](../ai/tools.md) and
the `tool_search` capability for large deferred tool catalogs.

Friday does not expose every tool on every turn. It selects a small set based on
the user's request, safety rules, and the current run context.

## Preloaded Local Tools

| Tool | How Friday uses it |
| --- | --- |
| [read](list/read.md) | Looks at an existing workspace file before answering questions or making changes. |
| [write](list/write.md) | Creates a new file or replaces a file when the requested outcome needs new content saved. |
| [edit](list/edit.md) | Changes a specific part of an existing file after Friday has read it. |
| [apply_patch](list/apply-patch.md) | Applies a planned set of file changes when several edits need to land together. |
| [delete](list/delete.md) | Removes a file when the user asks for it or when Friday's own change makes the file obsolete. |
| [copy](list/copy.md) | Duplicates a file so existing content can be reused elsewhere. |
| [move](list/move.md) | Renames or relocates a file while preserving its contents. |
| [inspect_file](list/inspect-file.md) | Checks basic facts about a file, such as what kind of file it is and whether it can be previewed. |
| [find](list/find.md) | Locates files by name or pattern so Friday can work in the right part of the workspace. |
| [exec](list/exec.md) | Runs an approved workspace command for checks, builds, tests, or project utilities. |
| [process](list/process.md) | Reviews or stops background commands that Friday started earlier. |
| [web_fetch](list/web-fetch.md) | Reads text from a web address when the answer depends on external page content. |
| [cron](list/cron.md) | Saves future, delayed, recurring, or reminder-style agent work. |
| [task](list/task.md) | Starts an immediate background agent run that should not block the current app session. |
| [open_browser](list/open-browser.md) | Opens a safe web address in the user's browser. |
| [browser](list/browser.md) | Uses a managed browser for navigation, screenshots, and page interaction. |

## Search Tools

| Tool | How Friday uses it |
| --- | --- |
| [tool_search](list/tool-search.md) | Searches a large deferred tool catalog so the model can load the right tools for the task only when needed. |
