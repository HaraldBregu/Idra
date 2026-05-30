# Coding Agents In The Background

Friday can run coding-oriented agent work without blocking the foreground conversation by using background tasks and subagents with coding tools enabled by policy.

## Functionality

- `agent.run` starts immediate background work in an isolated task session.
- `sessions_spawn` delegates scoped child work from the current agent into a `subagent.run` task.
- Background runs resolve the current provider/model at execution time.
- Task records track lifecycle, progress, result text, errors, and cancellation.
- Subagent records track child session key, requester session, target agent, model override, timeout, inherited tool policy, and outcome.
- The agent runtime can expose coding tools when the agent's tool policy allows them.

## Coding Tool Coverage

The local tool registry includes:

- File tools: read, write, edit, apply patch, delete, copy, move, inspect file, find.
- Shell/process tools: exec and process.
- Web/browser tools: web fetch, open browser, browser automation.
- Automation tools: cron and task.
- Extension tools: connector, plugin, MCP, LSP, and client-hosted tools when configured.

Agents can restrict tools by explicit allow/deny lists, tool groups, filesystem policy, shell policy, sandbox policy, and inherited subagent restrictions.

## Current Limits

Background task records are sanitized runtime records persisted in `task.json`. Persisted scheduling is still handled by cron schedules; schedule definitions and task execution records remain separate.

The background coding capability uses Friday's own agent runtime and local tool policies. It is not a separate external coding-agent service unless a plugin, MCP server, or configured tool runtime provides one.

## Source

- `src/main/tasks`
- `src/main/agent/subagents`
- `src/main/tools/local/registry.ts`
- `src/main/tools/runtime/create-agent-tools.ts`
- `src/main/workspace`
- Existing docs: `docs/tasks/background/index.md`, `docs/tools/index.md`
