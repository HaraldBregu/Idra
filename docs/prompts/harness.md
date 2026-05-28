# Harness Module Prompt

Implement and maintain the agent harness as a production-grade, UI-independent runtime that an agent can use without knowledge of the underlying provider, transport, or tool surface. The harness owns tool resolution, tool lifecycle hooks, intent-driven capability selection, skill loading, MCP integration, and result middleware. It does not own session persistence, provider streaming, or system prompt assembly — those belong to the agent module.

Use the existing layer model defined in `AGENT_HARNESS_LAYERS`. Do not introduce new layers unless a new durable responsibility emerges. Do not duplicate responsibilities across layers.

## Scope

The harness module owns these responsibilities:

- `createAgentHarness` factory and `DefaultAgentHarness` implementation.
- Tool registry, external tool discovery, and MCP tool provider integration.
- Intent classification for capability selection — local tools, skills, and remote MCP tools.
- Pre-tool-use and post-tool-use hook execution.
- Approval checkpoints, safety gates, and permission filtering.
- Skill discovery, selection, and loading.
- Result optimization through the `AgentHarnessToolResultOptimizer`.
- Event emission and operation logging for the tool lifecycle.
- Budget enforcement for iterations, tokens, cost, and time.

Do not move provider streaming, session indexing, system prompt construction, or cron scheduling into the harness. The harness integrates with those systems through injected interfaces.

## Module Names

Use existing file names when extending the implementation:

- `runtime` for the run loop, execute, stream, and subagent logic.
- `tools` for the tool registry, permission filtering, and approval predicates.
- `skills` for the file-backed skill loader.
- `mcp` for the MCP tool provider and server lifecycle.
- `connectors` for the connector registry and connector-backed tools.
- `context` for transcript compaction and context budget management.
- `memory` for in-memory persistence and operation log implementations.
- `events` for the event emitter and async event queue.
- `config` for validation and secret redaction.
- `model` for cost estimation and model descriptor helpers.
- `schema` for JSON schema validation.
- `errors` for typed harness errors and error shape conversion.
- `types` for all shared interfaces and the layer descriptor table.

Add a new file only when it represents a durable responsibility that does not fit the existing set.

## Intent-Driven Capability Selection

The harness must select tools based on the inferred intent of the task, not by exposing the full tool surface on every run.

Intent classification happens before each run in `resolveTools`. The goal is to give the model only the tools it is likely to need, reducing prompt noise and tool call confusion.

Apply these rules during tool resolution:

- Always include local tools that are always-on (no `group` or `enabled: false`).
- Discover external and MCP tools by passing the task to each `AgentHarnessExternalToolProvider.discover`. Providers use the task to self-select relevant tools.
- Load skills through `AgentHarnessSkillLoader.select` before resolving tools. Selected skills may add extra tools from `AgentHarnessSkill.tools`.
- Apply permission filters last: deny-listed tools are excluded even when intent matches.

Do not send the model all registered tools when only a subset is relevant. Prefer a smaller, focused tool surface per run over a large general surface. Trust provider `discover` implementations and skill `select` implementations to be the right place for matching logic.

When intent cannot be determined (empty task, ambiguous context), fall back to the full permitted tool surface and log a `capability.fallback` operation log entry.

### Tool Priority

When the same capability exists as a local tool, a skill tool, and an MCP tool, use this priority:

1. Local tools — lowest latency, no network, always available. Prefer for filesystem, cron, and application-native operations.
2. Skill tools — bundled with skill instructions. Use when the task explicitly requires a skill workflow.
3. MCP remote tools — external servers. Use only when the capability is not available locally. Discover them per run, not at startup.

Do not register MCP tools in the local tool registry. MCP tools come from `AgentHarnessExternalToolProvider.discover` and must not persist beyond the run.

## Pre-Tool-Use and Post-Tool-Use Hooks

Hooks are the extension point for observability, auditing, and side effects around tool execution.

The `AgentHarnessHook` interface exposes these lifecycle names:

- `before_run` — fires once before the run loop starts.
- `after_run` — fires once after the run loop completes, including on error.
- `before_model_call` — fires before each model turn.
- `after_model_call` — fires after each model turn.
- `before_tool_call` — fires before each individual tool execution.
- `after_tool_call` — fires after each individual tool execution, including on error.

The `before_tool_call` payload must include the tool definition, resolved arguments, run id, and session id. The `after_tool_call` payload must include the tool definition, resolved arguments, the tool result status, the content blocks, and duration in milliseconds.

Hook execution rules:

- Hooks run in registration order.
- Hooks must not mutate the tool arguments or result. They are observers, not interceptors.
- A hook that throws must not abort the tool call. Catch and log the hook error; continue execution.
- Hooks must complete before the next step begins. They are synchronous in effect even when async in signature.
- Hook timeout is not enforced by default. Callers that need timeout protection should wrap their hook in `AgentHarnessHook` with a guard.

Do not use hooks to block tool execution. Use `AgentHarnessSafetyController` for blocking decisions and `AgentHarnessApprovalController` for human-in-the-loop checkpoints.

## Tool Execution Path

Every tool call, regardless of source, goes through the same execution path in `executeToolCall`:

1. Look up the tool by name in the resolved tool list.
2. Emit `tool.started`.
3. Run `before_tool_call` hooks.
4. Validate arguments against the tool JSON schema.
5. Run `AgentHarnessSafetyController.reviewToolCall` if configured.
6. Run `AgentHarnessApprovalController.checkpoint` if the tool requires approval.
7. Execute the tool with a per-tool timeout derived from `tool.timeoutMs` or `runtime.toolTimeoutMs`.
8. Run `AgentHarnessToolResultOptimizer.optimize` if configured.
9. Run `after_tool_call` hooks.
10. Emit `tool.finished` with status and duration.

Never bypass this path for any tool source. MCP tools, skill tools, and connector tools must all enter at step 1 after being included in the resolved tool list.

## MCP Integration

MCP tools are discovered per run, not at startup. Configure MCP through `McpAgentHarnessToolProvider`:

```ts
new McpAgentHarnessToolProvider([
  { name: 'filesystem', transport: 'stdio', command: 'node', args: ['server.js'] },
  { name: 'remote', transport: 'http', url: 'https://example.com/mcp' },
]);
```

The provider connects to servers on first `discover` call, caches the tool list for the run, and disconnects when `close` is called. Emit `mcp.server.connecting`, `mcp.server.connected`, `mcp.inventory`, and `mcp.server.error` events through the tool context.

MCP tool names are prefixed with the server name: `server__tool_name`. This avoids collisions with local tools and makes the tool source legible in logs and events.

MCP server failures must degrade gracefully: emit `mcp.server.error` and return an empty tool list for that server. Do not fail the run when one server is unavailable.

## Skills

Skills add instructions to the system prompt and optionally add tools to the resolved surface.

The `FileAgentHarnessSkillLoader` is the default implementation. It reads skill folders from `rootDir`, each containing a `SKILL.md` file with YAML frontmatter.

Skill selection in `ensureSkills`:

1. Call `skills.list` to get available skill candidates.
2. Call `skills.select` with the task and candidates to get a filtered list of matching skill names.
3. Merge with any `requiredSkills` from the execute input.
4. Apply allow and deny lists from permissions.
5. Load each selected skill once; skip if already loaded.
6. Emit `skill.loaded` for each new skill.

Skill instructions are appended to the system prompt in `buildSystemPrompt`. Skill tools are merged into the resolved tool list.

The default `select` implementation uses keyword matching. Replace it with a semantic matcher when the available skill count grows large enough that keyword matching produces false positives.

## Permissions and Safety

Tool access is controlled at two levels:

- **Permissions** (`AgentHarnessPermissions`): static allow and deny lists applied during `resolveTools`. Tools excluded by permissions are never sent to the model.
- **Safety** (`AgentHarnessSafetyController`): dynamic per-call decisions evaluated during `executeToolCall`. A blocked safety decision returns `status: 'blocked'` without executing the tool.

Approval checkpoints sit between safety and execution. They are for human-in-the-loop decisions, not for policy enforcement. An approval rejection returns `status: 'rejected'`.

Destructive tools (`tool.destructive: true`) require approval by default unless `permissions.requireApprovalForDestructiveTools` is explicitly false. External-write tools (`tool.externalWrite: true`) follow the same pattern with `requireApprovalForExternalWrites`.

## Events and Logging

Every significant state change in the tool lifecycle emits a typed `AgentHarnessEvent`. The event union is the public observability contract — do not add fields to existing events without considering consumer impact.

Key tool lifecycle events:

- `tool.discovered` — emitted by each external provider after discovery.
- `tool.started` — emitted at the start of each tool call.
- `tool.finished` — emitted after each tool call with status and duration.
- `tool.error` — emitted when a tool throws an unhandled error.

Operation log entries are separate from events. Use `AgentHarnessOperationLogger` for structured, durable entries that outlive the event stream. Log run starts, completions, failures, and tool execution summaries. Redact secrets before logging.

## Configuration

The full harness configuration is `AgentHarnessConfig`. Required fields are `modelId` and `model`. All other fields are optional with safe defaults.

Defaults applied when fields are absent:

- `persistence`: `InMemoryAgentHarnessPersistence`.
- `logs`: `InMemoryAgentHarnessOperationLogger`.
- `secrets`: `DefaultAgentHarnessSecretRedactor`.
- `toolRegistry`: `DefaultAgentHarnessToolRegistry` seeded from `tools`.
- `runtime.maxIterations`: 25.
- `runtime.maxTokens`: 4096.

Validate the configuration in `validateAgentHarnessConfig` before constructing the runtime. Throw `AgentHarnessError` with `code: 'config_invalid'` for missing required fields or incompatible option combinations.

## Public API

Expose the harness through `createAgentHarness`:

```ts
const harness = await createAgentHarness(config);
for await (const event of harness.stream({ task: '...' })) {
  render(event);
}
```

The `execute` method returns a `AgentHarnessRunResult` when the run finishes. The `stream` method exposes the same execution as an async iterable of typed events.

Do not expose internal runtime state. Session state is accessible only through `getSession` and `listSessions`. Snapshots are accessible only through `createSnapshot` and `undo`.

## Implementation Rules

When changing the harness module:

- Match the existing TypeScript style and file boundaries.
- Keep the run loop in `runtime`. Do not move loop mechanics into `tools`, `skills`, or `mcp`.
- Keep intent classification inside `resolveTools`. Do not scatter tool filtering across the loop.
- Keep hook execution in `runHooks`. Do not call hooks inline in the middle of other logic.
- Keep the execution path for all tool types unified in `executeToolCall`. Do not create separate fast paths for MCP or skill tools.
- Add a new file only when there is a durable responsibility. Local helper functions near the behavior they support are preferred.
- Remove imports, exports, and files made unused by your change.
- Do not introduce decorative abstractions or compatibility shims.

## Testing

Add or update focused unit tests for behavior changes.

Cover the relevant behavior:

- Tool resolution with intent-matching providers that return subsets of tools.
- Pre-tool-use and post-tool-use hook execution order, error isolation, and payload shape.
- Safety controller block and approval controller reject paths returning correct statuses.
- Permission filtering: allow-list, deny-list, group filter, and destructive approval gate.
- MCP provider connection, tool discovery, server failure degradation, and tool name prefixing.
- Skill selection keyword matching, required skill merging, and permission filtering.
- Skill tool inclusion in the resolved tool surface.
- Result optimizer invocation and content replacement.
- Budget enforcement for iterations, tokens, cost, and timeout.
- Event emission order for the full tool call lifecycle.

Use the narrowest test command that covers the change. If a broader suite has unrelated failures, report those separately.

## Verification Checklist

Before finishing a harness change, verify:

- The harness still compiles for main-process TypeScript.
- `resolveTools` returns only tools appropriate to the task and permissions.
- `before_tool_call` and `after_tool_call` hooks receive correct payloads and a throwing hook does not abort the call.
- MCP tool names are prefixed and do not collide with local tool names.
- Safety blocks and approval rejections return the correct status without executing the tool.
- All tool sources enter execution through `executeToolCall`.
- New behavior is covered by focused unit tests.
