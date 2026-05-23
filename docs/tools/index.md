# Tools

The tools module provides the capabilities an agent can use during a run. It
builds local tools, plugin tools, MCP tools, LSP tools, and client-provided
tools into one scoped runtime tool set, then applies policy, schema
normalization, loop checks, approvals, execution limits, and output validation.

## Preloaded Local Tools

Friday currently preloads these local tools:

| Tool | Functionality |
| --- | --- |
| `read` | Reads bounded text from files after resolving workspace and policy rules. |
| `write` | Creates or overwrites workspace files after read-state checks. |
| `edit` | Performs targeted string replacement after the target file has been read. |
| `apply_patch` | Applies a unified patch after affected files have been read. |
| `delete` | Removes workspace files or recursive directories with read-before-delete checks. |
| `copy` | Copies a permitted source into a workspace destination. |
| `move` | Renames or relocates a workspace file or directory. |
| `inspect_file` | Returns file metadata and optional previews for supported files. |
| `find` | Searches for files by name or pattern. |
| `exec` | Runs a shell command with command denial rules, timeout handling, and output caps. |
| `process` | Lists, reads logs for, or stops background commands started by `exec`. |
| `web_fetch` | Fetches HTTP or HTTPS text and converts basic HTML to readable text. |
| `cron` | Manages Friday cron jobs for future, recurring, reminder, and wake work. |
| `task` | Starts an approved immediate background agent task. |
| `open_browser` | Opens an HTTP or HTTPS URL in the user's default browser. |
| `browser` | Controls a managed browser profile, tabs, snapshots, screenshots, and interactions. |

The bootstrap-only `startup_files` tool is added only when the primary agent
needs to manage allowlisted startup files during bootstrap.

## Tool Construction

Tool construction starts with an allowlist plan. The plan decides whether to
include file tools, shell tools, web tools, messaging tools, plugin tools, MCP
tools, LSP tools, and tool-search controls.

After candidates are gathered, policy stages filter them by sender, sandbox,
allowlists, denylists, read-only settings, filesystem settings, shell
availability, and plugin ownership. The final tools are normalized before they
are converted into model tool definitions.

When the available tool count is high, tool-search compaction can hide most
tools behind `tool_search`, `tool_describe`, and `tool_call`. This keeps the
prompt smaller while preserving access to explicitly discoverable tools.

## Selection For A Turn

Before a turn, Friday decides whether tools are needed. If the user explicitly
asks not to use tools, no tools are supplied. Tool introspection requests keep
the catalog visible. Otherwise, large tool sets are ranked against the prompt
and only the most relevant tools are included.

File-changing tools automatically include their read prerequisite when needed.
Google Calendar, Google Drive, and Gmail connector tools can also be force
selected when the prompt clearly matches those domains.

Skills may add required or allowed tools to the selected set. Skills with local
instruction paths also ensure the read tool is available so the agent can read
the skill instructions.

## Execution

Tool execution uses a common result shape. Inputs are checked against schemas,
rate and per-turn limits are enforced, timeouts are applied, retryable failures
can retry, outputs are validated, sensitive audit data is redacted, and warnings
are attached to successful results when validation finds issues.

The agent loop also runs a before-call check for identical-call loops. Repeated
identical calls receive warnings and eventually a veto result so the model must
change approach instead of looping indefinitely.

Tools can require approval. Approval state is tracked per call signature during
the turn and can also be forced by policy.

## Boundaries

File-changing tools are constrained to workspace writes. Read tools can allow
broader reads only when the active filesystem policy permits it. Shell
execution has hard-denied command patterns, timeout handling, background
process tracking, and output limits.

The cron tool is for future or recurring work. The task tool is for immediate
background agent work. Browser tools validate URLs and block local or private
network targets before navigation.
