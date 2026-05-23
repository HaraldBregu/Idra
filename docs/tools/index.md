# Tools

Tools are the controlled actions the agent can call while completing a turn. The main process assembles local tools, connector tools, skill execution, plugin tools, MCP tools, and browser automation into a policy-checked runtime.

## Built-In Local Tools

| Tool | Functionality |
| --- | --- |
| `read` | Reads workspace files after path validation. |
| `write` | Writes workspace files within allowed boundaries. |
| `edit` | Applies targeted file edits. |
| `apply_patch` | Applies structured patches to workspace files. |
| `delete` | Deletes allowed workspace files. |
| `copy` | Copies allowed files or directories. |
| `move` | Moves allowed files or directories. |
| `inspect_file` | Returns file metadata and focused inspection output. |
| `find` | Searches files and text within allowed roots. |
| `exec` | Runs shell commands under command policy and approval rules. |
| `process` | Tracks and controls managed background processes. |
| `web_fetch` | Fetches web content through URL and policy checks. |
| `cron` | Manages Friday cron jobs and wake requests. |
| `task` | Creates and inspects background agent tasks. |
| `open_browser` | Opens a managed browser page. |
| `browser` | Controls managed browser profiles, tabs, snapshots, screenshots, and page actions. |

## Assembly

The agent service starts with the local tool set. It then applies the active tool policy profile, user or mode allowlists, connector tools, skill execution tools, heartbeat tools, plugin tools, MCP tools, and language-server tools when those paths are enabled and available.

Tool definitions are trimmed and ranked before they are sent to a provider. Connector intent can force a relevant connector tool into the available set. Tool search can expose deferred tools when the full catalog would be too large for the current turn.

## Execution

The tool runtime validates inputs, checks policy, detects repeated loops, applies approval cache decisions, enforces timeouts and rate limits, tracks per-turn tool budgets, retries where allowed, audits calls, and validates outputs before returning results to the agent.

Tool calls are normalized so provider-specific function call formats do not leak into individual tool implementations.

## Boundaries

Filesystem tools enforce workspace and path guards. Write-like tools require the agent to inspect relevant files before changing them. Command execution rejects denied patterns, tracks background processes, and separates process management from normal command results.

Web and browser tools apply URL safety rules. Browser automation uses managed profiles and blocks unsafe local or private-network targets unless policy allows them.
