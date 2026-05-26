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

## Agent Runtime Responsibilities

The agent module is the application's agent control plane. It manages agent state, history, tools, skills, MCP-facing capability metadata, and orchestration logic through the existing service boundaries.

These responsibilities must be implemented inside `AgentService`, `AgentExecutionService`, `AgentCapabilityService`, hooks, policies, persistence, and subagent services. Do not introduce a separate harness abstraction to hold them.

The agent runtime has seven jobs:

- Gives the model capabilities: connect the model to tools, APIs, MCPs, skills, browsers, code execution, filesystems, and sandboxes through explicit service boundaries.
- Provides operating context: supply system prompts, tool descriptions, project instructions, memory, files, prior state, and task constraints without loading irrelevant context.
- Controls execution: manage loops, retries, handoffs, subagents, model routing, planning, and the rules for when the agent should continue or stop.
- Stores and manages state: persist work across steps using session records, files, logs, checkpoints, memory, artifacts, run state, and context compaction.
- Adds deterministic safeguards: run hooks, middleware, validation, linting, tests, permission checks, and other controls that reduce purely probabilistic behavior.
- Enables verification: inspect outputs, run tests, browse results, compare against requirements, and route errors back for repair.
- Improves long-task performance: decompose work, preserve context, spawn specialist subagents, recover from failures, and continue across many steps.

### Agent Chat Memory

Start memory persistence with chat message storage.

Use the application data directory as the durable memory root. Under appdata, create an `agent/` directory owned by the agent module:

```text
appdata/
  agent/
    chats/
```

Store agent chat messages under `appdata/agent/chats/`. Each chat should have a stable file-backed record containing the chat id, agent id, session id, timestamps, metadata needed to resume, and the ordered user, assistant, and tool messages for that chat.

The chat memory store should:

- Write messages after each completed model/tool turn so progress survives process restarts.
- Load prior messages when an agent session resumes.
- Keep chat persistence behind the agent service boundary.
- Use safe file names derived from stable chat or session ids, not raw user text.
- Sanitize stored messages using the same transcript safety rules used for session storage.
- Avoid storing connector secrets, raw credentials, hidden reasoning, or unrelated tool catalog data.
- Keep append/update behavior deterministic enough for tests to verify the stored message order.

The agent module should make these questions explicit:

- What can the agent know? It may know the current prompt, selected provider and model metadata, reasoning effort, current date, workspace metadata, sender metadata, startup context, policy result, selected tool metadata, connector tool metadata, selected skill instructions, MCP capability metadata when supported, transcript history, compacted history, persisted run state, and safe service-provided context. It must not load irrelevant skills, full tool catalogs, connector secrets, private auth data, or arbitrary files into the model context.
- What can the agent do? It may stream model output, call selected tools through `ToolServicePort`, execute connector-backed tools through the connector service path, apply selected skill prompt additions, spawn or control subagents when the subagent services are injected and allowed, compact history on context pressure, update run state, and persist transcript/session results. It must not bypass policy, call tools directly, duplicate connector logic, or create provider-specific execution paths outside `AgentExecutionService`.
- Where does the agent do it? Execution belongs in the main process under `src/main/agent`. Transport code stays outside the module, IPC remains an adapter, renderer code never owns execution, and filesystem or external-system mutation happens only through approved services and tools. Durable artifacts should live in the workspace, user data directory, store-backed session state, task records, logs, or Git history as appropriate for the operation.
- How does the agent remember? It remembers through the active transcript, persisted chat records under `appdata/agent/chats/`, persisted session records, run records, compaction summaries, workspace files, startup files, task/subagent records, user or workspace preferences exposed by injected services, and Git history for file-backed work. Do not rely on hidden module-level memory as the canonical state for resumable work.
- How does the agent verify success? The model's final text is not proof. Verification should come from deterministic controls such as tool result statuses, schema validation, policy results, tests, typechecks, lint checks, browser or screenshot inspection, stream event ordering, run state transitions, and `run_finished` stop reasons. When a task requires validation, the relevant service or caller should be able to run the check and block completion on failure.
- How does the agent continue across long tasks? It should use the provider/tool loop, persisted session state, explicit run state, compaction on context overflow, stream events, task records, and subagent context isolation. Existing runs should be executable again through `AgentService`, and long-running work should leave enough persisted state to resume without replaying an oversized conversation.
- How does the system recover when the model fails? It should fail closed on policy denials, return `blocked` for disallowed tool calls, return `error` for invalid arguments or thrown tools, persist partial run state, log redacted diagnostics, route actionable errors back through the execution loop when safe, compact and retry context-overflow cases, support cancellation, and allow callers to resume or rerun from persisted state. Do not hide failures behind successful final text.

## Component Analysis

System prompts are the first control surface, but they are probabilistic guidance rather than enforcement. Use `system-prompt.ts` to encode role, mission, operating procedure, tool-use norms, escalation rules, planning requirements, output contracts, and quality bar. Pair prompt guidance with deterministic controls in services, policies, hooks, schemas, and tests whenever correctness matters.

Tools, skills, connectors, and MCP metadata define the agent's capability surface:

- Specific tools are safer and more structured because their arguments, permissions, and result statuses can be validated.
- General-purpose execution tools are more flexible when allowed, but they must still pass through `ToolServicePort` and policy checks.
- Skills are progressive-disclosure packages. Load skill metadata for discovery, then load full instructions only for selected skills.
- Connectors are service-backed tools and should carry connector identity in metadata.
- MCP/provider-hosted tools should be represented as capability metadata only when explicitly supported by the execution path.

The filesystem, user data directory, store, task records, logs, and Git history are infrastructure for durable work. Use them to persist state, checkpoints, intermediate artifacts, and rollback-friendly project changes. Do not treat conversation context as the only memory store for long-running work.

Orchestration logic belongs in service code rather than prompt text. The normal loop is reason, call provider or tool, observe results, update transcript, and repeat until the run finishes, cancels, blocks, errors, or needs compaction. For larger work, use task records and subagents to isolate context, coordinate child runs, and keep parent execution readable.

Hooks and middleware are deterministic interventions around model behavior. Use them for pre-run blocking, argument validation, output validation, tool-output shaping, context compaction, cancellation, logging, and verification. Prefer service-level checks over instructions that merely ask the model to behave.

Evaluate the agent module as a model-service pair, not as a prompt alone. A useful implementation should answer:

- Capability surface: which files, tools, connectors, MCP capabilities, APIs, and execution environments can the agent access?
- State and memory: where are conversation state, run state, compacted history, project artifacts, preferences, and subagent records stored?
- Context management: how are skills selected, large outputs handled, transcripts compacted, artifacts offloaded, and subagent contexts isolated?
- Verification: which tests, schemas, stream events, browser checks, typechecks, lint checks, or human-visible run states prove the work?
- Control and recovery: what happens on policy denial, invalid tool args, provider errors, context overflow, cancellation, partial failure, or unsafe action?
- Security and permissions: which sandbox, network, filesystem, command, credential, and logging constraints apply?

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

## Component Reference

This section explains the expected role of each module under `src/main/agent`. Keep these responsibilities stable when refactoring so the agent service remains understandable and testable.

### `index.ts`

Public export boundary for the agent module.

- Re-export public service classes, service ports, DTOs, routing helpers, subagent APIs, and capability services.
- Do not export private implementation helpers unless another module genuinely needs them.
- External main-process modules should import agent APIs from this file instead of deep-linking into internal files.

### `service.ts`

Main orchestration service.

- Owns the public `AgentService` API.
- Creates, reads, updates, deletes, and lists agent runs.
- Resolves provider, model, reasoning effort, workspace, session, startup context, run ids, and agent metadata.
- Builds `ToolContext` for the run.
- Evaluates tool policy and `beforeAgentRun` hooks.
- Loads startup files and builds the system prompt.
- Calls `AgentCapabilityService` before execution.
- Calls `AgentExecutionService` for the provider/tool loop.
- Saves sessions and updates run records after completion, cancellation, or error.
- Accepts a stream callback and emits response events with `agentId` and `runId` attached.
- Must not own IPC registration, renderer transport, provider loop internals, connector management UI, or human approval UI.

### `run.ts`

Provider-neutral execution loop.

- Exposes `AgentExecutionService` and `AgentExecutionServicePort`.
- Accepts a fully prepared run input from `AgentService`.
- Calls the selected provider adapter stream.
- Emits streaming events for run state, text deltas, tool calls, tool results, reasoning summaries, and run finish.
- Parses provider tool-call arguments.
- Executes tools only through `ToolServicePort`.
- Updates the transcript with user, assistant, and tool entries.
- Tracks usage, iterations, tool count, stop reason, and final text.
- Handles cancellation and context overflow compaction.
- Must not resolve application services, perform IPC broadcasts, choose capabilities, or implement runtime selection.

### `compaction.ts`

Conversation compaction helper.

- Summarizes older transcript entries when the provider reports context overflow.
- Keeps recent turns verbatim and replaces older turns with a compact synthetic summary.
- Uses the active provider adapter so summary generation stays provider-neutral.
- Produces compaction markers for session metadata.
- Must not call runtime or harness APIs.

### `before-agent-run.ts`

Pre-execution hook evaluation.

- Defines and evaluates hooks that can inspect the prompt, transcript, sender metadata, and system prompt before the model run starts.
- Allows safe blocking before provider execution.
- Keeps pre-run policy separate from the provider/tool execution loop.
- Should stay deterministic and side-effect-light.

### `system-prompt.ts`

System prompt assembly.

- Builds the model-facing system prompt from workspace context, date, model metadata, selected tools, startup files, bootstrap mode, and heartbeat settings.
- Keeps prompt construction centralized so callers do not inline prompt text.
- Capability prompt additions from selected skills are appended by `AgentService` after this base prompt is built.

### `logger.ts`

Agent logging entrypoint.

- Provides the agent-specific logger used by run execution, compaction, and other agent internals.
- Logs should be useful for diagnosis and should avoid secrets, raw credentials, private connector auth data, or excessive transcript content.

### `capabilities/index.ts`

Public export boundary for the capability resolver submodule.

- Re-exports `AgentCapabilityService`, options, service port, bundle, input, and resolved skill types.
- Keeps capability internals behind a small public surface.

### `capabilities/types.ts`

Capability resolver contracts.

- Defines `AgentCapabilityServicePort`.
- Defines `AgentCapabilityResolveInput`, which contains prompt, provider/model metadata, tool policy state, local tools, context, configured skills, and stream callback.
- Defines `AgentCapabilityBundle`, which returns selected executable tools, connector tools, skills, prompt additions, and direct-answer metadata.
- These types are main-process implementation contracts. Cross-process DTOs belong in `src/shared/agents/capabilities.ts`.

### `capabilities/service.ts`

Prompt-based capability resolution service.

- Resolves connector tools from `ConnectorsService.createAgentTools()`.
- Resolves skills from `SkillsService` by configured skill names and prompt matching.
- Emits `capability_resolution_start` and `capability_resolution_result` stream events.
- Returns prompt additions for selected skills.
- Keeps connector/skill discovery out of `AgentService` and out of the provider loop.
- Should keep selection bounded and deterministic so prompts remain small and predictable.

### `routing/index.ts`

Public export boundary for routing helpers.

- Re-exports route resolution, binding parsing, session-key construction, and routing types.
- Used by channel or task callers that need to map an incoming message to an agent/session.

### `routing/types.ts`

Routing contracts.

- Defines route configuration and resolved route shapes.
- Keeps channel-to-agent route data explicit instead of embedded in callers.

### `routing/bindings.ts`

Route binding parsing and normalization.

- Reads route-like records and normalizes agent id, channel id, model/provider options, skills, and other routing fields.
- Keeps unsafe or loose configuration parsing outside `AgentService`.

### `routing/resolve-route.ts`

Route selection logic.

- Resolves which agent should handle an incoming message based on configured bindings and request metadata.
- Should return deterministic route results and avoid executing agent work directly.

### `routing/session-key.ts`

Session key construction.

- Builds stable session keys for routed agent conversations.
- Keeps session naming consistent across channels, tasks, and subagent work.

### `subagents/index.ts`

Public export boundary for subagent support.

- Re-exports subagent registry, spawn service, task handler, control tool, spawn tool, and related types.
- Consumers should import subagent APIs from this index, not from individual internals.

### `subagents/types.ts`

Subagent contracts.

- Defines subagent spawn input, child-agent metadata, registry records, and service ports.
- Keeps parent/child run coordination explicit and testable.

### `subagents/registry.ts`

Subagent registry.

- Tracks subagent definitions and spawned child-agent metadata.
- Enforces child-count and ownership-style constraints where appropriate.
- Should not execute provider calls directly.

### `subagents/spawn-service.ts`

Subagent spawning service.

- Coordinates child-agent creation and execution through `AgentService` and task infrastructure.
- Preserves parent metadata, cancellation behavior, timeouts, and session linkage.
- Keeps child-agent orchestration out of tool implementations.

### `subagents/task-handler.ts`

Background task handler for subagent runs.

- Handles scheduled or queued child-agent work.
- Calls `AgentService` for actual execution.
- Converts task input/output into subagent run records.

### `subagents/spawn-tool.ts`

Agent tool for spawning child agents.

- Exposes controlled child-agent creation to the model as a tool when allowed.
- Should delegate orchestration to `SubagentSpawnService` instead of implementing child run logic inline.

### `subagents/control-tool.ts`

Agent tool for controlling child agents.

- Exposes control actions such as inspecting or cancelling child-agent work when allowed.
- Should delegate state and cancellation behavior to the subagent services.

## How the Pieces Work Together

A normal run should follow this sequence:

```text
caller or transport
  -> AgentService.send
  -> service.ts resolves provider/model/session/workspace/policy
  -> capabilities/service.ts resolves tools, connectors, and skills
  -> system-prompt.ts builds the base prompt
  -> service.ts appends skill prompt additions
  -> run.ts streams provider output and executes tools through ToolService
  -> compaction.ts runs only if context overflow occurs
  -> service.ts persists session and run state
  -> caller receives final text and stream events
```

Routing and subagents are supporting modules:

- `routing/*` decides which agent/session should receive work before `AgentService.send` is called.
- `subagents/*` coordinates child-agent work, but child execution still goes through `AgentService`.

Do not add a second provider loop, tool loop, event stream, or session persistence path in routing, subagents, IPC, channels, heartbeat, or task modules.
