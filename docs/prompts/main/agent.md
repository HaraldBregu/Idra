# Agent Module Prompt

Create or refactor the agent module as a reusable main-process service.

The agent module owns agent execution for the application. Any caller that needs to run, cancel, inspect, or coordinate agent work must use the exported agent service instead of creating feature-specific agent logic.

The implementation must be service-only, dependency-injected, streaming-first, and organized around clear TypeScript boundaries. Do not implement runtime or harness abstractions. Do not implement human-in-the-loop approval flows.

## Architecture

The agent module lives under `src/main/agent` and should be organized by responsibility:

```text
src/main/agent/
  index.ts
  service.ts
  run.ts
  compaction.ts
  capabilities/
    index.ts
    service.ts
    types.ts
  routing/
  subagents/
  logger.ts
  system-prompt.ts
  before-agent-run.ts
```

Shared contracts live under `src/shared/agents`:

```text
src/shared/agents/
  constants.ts
  capabilities.ts
  events.ts
  index.ts
  service.ts
```

Use `src/shared/agents` for types, constants, event DTOs, service DTOs, status strings, and capability DTOs that are consumed outside `src/main/agent`. Keep implementation-only types inside `src/main/agent`.

## Service Responsibilities

`AgentService` is the public orchestration boundary. It should:

- Create agent runs.
- Read agent run state.
- Update agent run state.
- Delete agent runs.
- List agent runs.
- Send prompts to the agent.
- Execute existing runs.
- Cancel active runs.
- Reset sessions.
- Load agent history.
- Resolve provider, model, reasoning effort, workspace, session, startup context, and run metadata.
- Evaluate `beforeAgentRun` hooks before execution.
- Build system prompts through `system-prompt.ts`.
- Resolve capabilities through `AgentCapabilityService`.
- Execute model/tool turns through `AgentExecutionService`.
- Persist session and run state after execution.
- Expose stream events through a callback, not through IPC-specific logic.

`AgentExecutionService` owns the provider-neutral execution loop. It should:

- Call the selected provider adapter.
- Stream text deltas.
- Stream model/run state events.
- Stream safe reasoning summaries only.
- Parse tool calls from provider events.
- Execute tools only through `ToolService`.
- Append user, assistant, and tool entries to the transcript.
- Handle context overflow through compaction.
- Handle cancellation.
- Track usage, iteration count, tool count, stop reason, and final text.

`AgentCapabilityService` owns prompt-based capability resolution. It should:

- Receive the prompt, agent context, model/provider metadata, policy result, and injected services.
- Resolve local tools from `ToolService`.
- Resolve connector-backed tools from `ConnectorsService`.
- Resolve relevant skills from `SkillsService`.
- Return executable tools, connector tools, selected skills, prompt additions, and direct-answer metadata.
- Emit capability-resolution stream events.

## Dependencies

Use explicit service dependencies and ports. Do not create hidden singletons for agent execution.

Required dependencies:

- `StoreService`
- `CronService`
- `LoggerService`
- `EventBus`
- `WorkspaceService`
- `UserDataDirectoryService`
- `PolicyServicePort`
- `ToolServicePort`

Optional injected services:

- `ConnectorsService`
- `SkillsService`
- `McpRegistry`
- `TasksService`
- `SubagentSpawnPort`

The agent module may depend on these services through constructor injection or service options. Callers should not manually assemble provider loops, tool loops, connector tools, skill prompts, or transcript writes.

## Streaming Contract

Agent responses are streamed through `AgentRunStreamEvent` from `src/shared/agents/events.ts`.

The service should emit:

- `model_selected`
- `capability_resolution_start`
- `capability_resolution_result`
- `run_state`
- `reasoning_summary`
- `text_delta`
- `tool_call_start`
- `tool_call_args_delta`
- `tool_call_input`
- `tool_call_result`
- `run_finished`

`AgentService.send` may accept a `streamEvent` callback. The callback should receive response events with `agentId` and `runId` added by the service. Transport layers such as IPC should bridge those events to the renderer. `src/main/agent` must not own IPC handlers or renderer transport behavior.

Do not stream hidden chain-of-thought. `reasoning_summary` is only for safe provider summaries or sanitized status.

## Capability Model

Capabilities are resolved before the provider execution loop.

Use this flow:

```text
user prompt
  -> provider/model/effort resolution
  -> policy evaluation
  -> capability resolution
  -> system prompt assembly
  -> provider-neutral streaming execution
  -> session persistence
```

Capabilities should be minimal and prompt-relevant:

- Tools are executable actions.
- Connectors are service-backed tools.
- Skills are prompt instructions and context.
- MCP/provider-hosted tools are not part of the local execution path unless explicitly added later.

Tool metadata should include service identity when available:

```ts
interface AgentTool {
  name: string;
  displayName?: string;
  displaySummary?: string;
  serviceKind?: 'tool' | 'connector' | 'mcp';
  serviceId?: string;
}
```

Local tools default to `serviceKind: 'tool'`. Connector tools use `serviceKind: 'connector'` and set `serviceId` to the connector id.

## No Harness Layer

Do not create or use a harness layer.

Do not add:

- Harness registries.
- Harness runtime selection.
- Harness activation hooks.
- Harness IDs.
- Runtime fallback behavior.
- Plugin-specific execution loops.

The agent service has one execution path: `AgentService` resolves context and capabilities, then calls `AgentExecutionService`.

## No Human-in-the-Loop Approval Flow

The agent path must not use human approval state.

Do not add:

- Approval prompts.
- Approval cache state.
- Approval-required state.
- Tool confirmation UI coupling.
- `rejected` status for user-denied calls.

Allowed tool calls execute automatically. Policy-denied tool calls return or emit `blocked`. Invalid arguments and thrown tools return or emit `error`.

Use these tool result statuses:

```ts
type AgentToolResultStatus = 'ok' | 'error' | 'blocked';
```

## Module Boundaries

Keep `src/main/agent` isolated:

- Only `src/main/agent/index.ts` should expose public agent exports.
- External modules should import from the agent index, not internal files.
- IPC must stay in `src/main/ipc` and consume `AgentService` as a transport adapter.
- Renderer-facing event, status, and DTO types must come from `src/shared/agents`.
- Implementation-only helpers stay inside `src/main/agent`.
- Routing stays in `src/main/agent/routing`.
- Subagent behavior stays in `src/main/agent/subagents`.

When changing the agent service, refactor the owning service directly. Do not layer patch-style compatibility shims, duplicate execution paths, or migration wrappers unless explicitly requested.

## Software Standards

Follow the project's TypeScript and software standards:

- Prefer small behavior-oriented interfaces.
- Use dependency injection for replaceable services.
- Keep constructors simple.
- Avoid decorative abstractions.
- Validate unsafe inputs at boundaries, especially tool args, connector args, skill metadata, and stream payloads.
- Redact secrets and private data in logs.
- Keep provider APIs behind provider adapters.
- Keep tool execution behind `ToolServicePort`.
- Keep connector execution behind `ConnectorsService`.
- Keep skill loading behind `SkillsService`.
- Keep prompt building centralized.
- Delete unused files, imports, exports, tests, and local types made obsolete by refactors.

## Implementation Requirements

When implementing from scratch or refactoring:

- Always implement logging for new or changed operational behavior using the application logger. Do not use console logging for module behavior.
- Define shared agent constants in `src/shared/agents/constants.ts`.
- Define shared capability DTOs in `src/shared/agents/capabilities.ts`.
- Define shared stream events in `src/shared/agents/events.ts`.
- Export shared contracts from `src/shared/agents/index.ts`.
- Implement `AgentCapabilityServicePort` in `src/main/agent/capabilities`.
- Implement `AgentExecutionServicePort` in `src/main/agent/run.ts` or an execution subfolder if the file becomes too large.
- Keep `AgentService` focused on orchestration, not provider loop details.
- Add connector tool metadata when connector tools are created.
- Remove old runtime/harness files if they become unused.
- Remove human-approval state from the new agent execution path.
- Keep event broadcasting outside the agent module by passing a stream callback from the transport layer.

## Testing

Tests should call the exported agent service or explicit service ports. They should not import private implementation files unless the file is a public service boundary.

Cover:

- Run creation.
- Run state reads and updates.
- Run deletion and listing.
- Text-only execution.
- Tool execution through `ToolService`.
- Connector tool metadata and execution path.
- Skill selection and prompt additions.
- Policy-denied tool calls emitting `blocked`.
- Invalid tool arguments emitting `error`.
- Cancellation.
- Context compaction.
- Stream event ordering for model, capability, state, tool, text, and finish events.

Verify with the narrowest relevant typecheck, lint, test, or docs check before finishing when validation is requested.

## From-Scratch Build Prompt

Use this prompt when asking an implementer or agent to build the module from scratch:

```text
Build `src/main/agent` as a service-only streaming agent module.

Do not create a harness layer, runtime registry, runtime selector, human approval flow, IPC handler, or renderer transport inside `src/main/agent`.

Create shared contracts in `src/shared/agents`:
- `constants.ts` for service kinds, tool result statuses, and stop reasons.
- `capabilities.ts` for capability-resolution DTOs.
- `events.ts` for `AgentRunStreamEvent` and response events.
- update `index.ts` exports.

Implement `AgentService` as the public orchestration service:
- resolve provider/model/effort
- load/create sessions
- evaluate policy and before-run hooks
- resolve capabilities
- build system prompts
- call `AgentExecutionService`
- persist transcript/session/run state
- expose stream events through a callback

Implement `AgentCapabilityService`:
- resolve local tools from `ToolService`
- resolve connector tools from `ConnectorsService.createAgentTools()`
- resolve relevant skills from `SkillsService`
- return selected tools, connector tools, skills, prompt additions, and direct-answer metadata
- emit capability stream events

Implement `AgentExecutionService`:
- call the provider adapter stream
- emit model/run/text/tool/reasoning/finish events
- execute tools only through `ToolServicePort`
- append transcript entries
- compact on context overflow
- support cancellation
- return final text, usage, tool count, stop reason, and session

Use `ok`, `error`, and `blocked` as tool result statuses. Do not use user approval state or `rejected` semantics.

Keep IPC in `src/main/ipc` as a transport adapter that calls `AgentService.send` and forwards streamed response events.

Follow TypeScript design standards: explicit ports, dependency injection, small interfaces, shared DTOs in `src/shared`, no globals for execution state, no duplicate execution paths, and no decorative abstractions.
```
