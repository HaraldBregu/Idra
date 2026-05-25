# Agent Implementation Review And Plan

This review checks Friday's current agent implementation against [How An Agent Works](index.md) and the behavioral contract in [Agent acceptance criteria](acceptance-criteria.md).

## Assumptions

- Scope is the main-process agent runtime, tool runtime, memory runtime, harness layer, and related tests.
- Renderer UI polish, provider-specific API payload details, and data migrations are out of scope.
- The plan should build on the existing [Agent runtime refactor implementation plan](../agent-runtime-refactor-implementation-plan.md) instead of replacing it.
- The target harness is a first-party Friday harness designed for this codebase. It must not be a third-party runtime, a copied agent harness, or an adapter that makes another agent system the product runtime.

## Component Map

| Agent part from `index.md` | Current implementation | Review |
| --- | --- | --- |
| Model | Provider adapters implement a provider-neutral `ProviderAdapter` stream contract in `src/main/provider/types.ts`. `AgentService.send(...)` resolves provider, model, and effort before the run. | Present. Provider capability metadata is still mostly implicit, which is already covered by the runtime refactor plan. |
| Instructions | `src/main/agent/system-prompt.ts` builds the system prompt, workspace contract, acceptance contract, skill guidance, heartbeat guidance, and startup-file context. | Present and recently strengthened with prompt-level acceptance criteria. |
| Harness | `src/main/agent/harness` selects a built-in fallback harness or alternate registered harnesses. The current built-in path delegates to `runAgent(...)`. | Present. The boundary matches [Agent harnesses](../harness/index.md): service owns preparation, harness owns execution. The implementation target is a first-party Friday harness, not a third-party or copied runtime. |
| Context | Sessions are loaded and saved through `src/main/session/store.ts`; startup files and workspace context are included before prompt build; streaming events expose run state and tool activity. | Present. Context assembly is spread across `AgentService.send(...)`, making memory, retrieval, tool policy, and startup context harder to reason about together. |
| Tools | `src/main/service.ts` builds local tools, connector tools, subagent tools, then runs them through `createAgentTools(...)`. `src/main/agent/run.ts` executes selected tools through the managed executor path. | Partially present. There is still a legacy-to-runtime bridge and tool selection happens in both service and run layers. |
| Memory | `src/main/memory-runtime.ts` can search memory files and session transcripts, read memory files safely, and flush transcript content before compaction. | Partially present. Normal agent turns do not visibly receive a memory manager or memory-search tool by default. |
| Retrieval | File tools, startup files, connectors, skills, and MCP materialization provide retrieval paths. | Partially present. Retrieval is not a single deliberate layer, and memory retrieval is not wired into the default turn path. |
| Permissions | Tool policy filters tools, filesystem and shell policies constrain local tools, and `beforeToolCall(...)` detects loops. | Incomplete. Approval metadata is recorded, but it does not block high-impact tool execution. |
| Output structure | Provider events are normalized into transcript blocks and stream events. Final text is persisted and returned to the caller. | Present. Final-response reliability is mostly prompt-driven; there is no deterministic completion checker for requested format, failed tools, or verification disclosure. |

## Findings

### 1. Approval metadata does not enforce approval

Severity: High

Evidence:

- Local and connector tools can declare `needsApproval`.
- `src/main/tools/policy/before-call.ts` adds matching calls to `ctx.approvalCache`, then still returns `proceed: true`.
- `src/main/tools/management/agent-integration.ts` turns cached legacy approvals into confirmed action ids and its `requestConfirmation()` implementation returns `true`.
- `tests/unit/main/agent/run.test.ts` currently expects an approval-marked tool to execute and return `ok`.

Impact:

This conflicts with the permissions and autonomy sections of `docs/agent/index.md`. The agent can run tools that are labeled as requiring approval, including file, shell, task, cron, startup, and some connector actions.

Implementation direction:

- Introduce a real approval decision port at the tool execution boundary.
- Return a `rejected` tool result when approval is required but unavailable.
- Wire UI or caller confirmation only where a product flow exists.
- Update tests so approval-marked tools no longer execute merely because metadata was cached.
- Remove or rename any approval field that remains advisory rather than blocking.

### 2. Memory and retrieval are implemented but not first-class in normal turns

Severity: High

Evidence:

- `buildSystemPrompt(...)` accepts `memory?: MemoryManager`, but `AgentService.send(...)` does not pass one.
- `WorkspaceMemorySearchManager` can search `MEMORY.md`, `memory/**/*.md`, and session transcripts, but `runAgent(...)` only calls `flushSessionMemoryBeforeCompaction(...)` during context overflow handling.
- Startup files are included as prompt context, but task-specific memory search is not exposed as a normal retrieval choice.

Impact:

The agent can rely on startup context and file tools, but it does not consistently satisfy the `Context, Memory, And Retrieval` flow from `docs/agent/index.md`. It may miss relevant durable memory unless that memory happens to be included in startup files or discovered through another tool.

Implementation direction:

- Add an `AgentRunContextAssembler` or equivalent small service that prepares prompt context, memory options, retrieval tools, and tool policy for one turn.
- Instantiate `WorkspaceMemorySearchManager` from `AgentService` using the resolved workspace, session id, and session base directory.
- Expose memory search/read as tools, or run a narrow pre-retrieval step only when the user request is likely to need durable context.
- Keep memory results lower-priority than system, developer, user, and current tool results.
- Cover path restrictions, session visibility, disabled memory, and no-result behavior with tests.

### 3. MCP support exists in pieces but is not wired through the default agent path

Severity: Medium

Evidence:

- `AgentServiceDependencies` accepts `mcpRegistry`.
- `McpRegistry.buildTools(...)` creates OpenAI MCP tool payloads.
- `createAgentTools(...)` can materialize runtime MCP tools through `mcpRuntime`.
- `AgentService.createDefaultTools(...)` does not pass an MCP runtime, and `mcpRegistry` is not otherwise used by the main agent service path.

Impact:

The documentation says external capabilities should be used through their exposed schema and permission model. Today the local runtime path and OpenAI-hosted MCP registry are not unified, so MCP availability depends on future wiring rather than the normal agent preparation flow.

Implementation direction:

- Decide whether each connector is local executable, provider-native hosted MCP, or deferred catalog.
- Pass MCP runtime capabilities into canonical tool assembly when local execution is available.
- Attach provider-native MCP only for providers that declare support.
- Preserve allowed-tool and approval metadata in both modes.
- Add service-path tests proving configured MCP capabilities appear only when executable or provider-supported.

### 4. Tool selection is split across service and run layers

Severity: Medium

Evidence:

- `AgentService.send(...)` selects tools and appends a tool-selection prompt suffix before calling the harness.
- It then calls `runAgentHarnessAttempt(...)` with `toolManagement: { enabled: false }`.
- `runAgent(...)` still calls `selectAgentToolsForTurn(...)` internally, but the disabled management flag changes behavior depending on the caller.

Impact:

The run path is harder to audit because service-level selection and run-level selection can drift. Plugin harnesses receive a prepared tool list, while the built-in loop still contains selection logic.

Implementation direction:

- Make one layer the owner of per-turn tool selection.
- Prefer service ownership if harnesses should receive a fully prepared request.
- Keep `runAgent(...)` able to execute already-selected tools without reselecting.
- Add tests that show the selected prompt tool list matches the executable tool list for service sends.

### 5. Final reliability checks are mostly prompt-level

Severity: Medium

Evidence:

- The system prompt now contains an acceptance contract.
- Tool failures, malformed arguments, loop detection, context overflow, stream events, and persistence are tested.
- There is no deterministic final-answer check for requested format, material tool failures, stale facts, or verification disclosure.

Impact:

The implementation can encourage good final responses, but it cannot reliably detect when the model skipped an important acceptance criterion before returning.

Implementation direction:

- Start with observability rather than a heavy guardrail system.
- Add a lightweight finalization helper that records whether the run had failed tools, partial tool results, context compaction, or unverified external claims.
- Surface those facts to the final prompt suffix or final stream metadata.
- Test that failed tool calls remain visible to the final model turn and are not silently hidden.

## Implementation Plan

### Phase 1: Enforce permission semantics

Goal: A tool marked as requiring approval cannot execute without a real approval decision.

Steps:

1. Add an approval decision interface to the managed tool execution context.
2. Change the legacy `needsApproval` bridge so unresolved approval produces `status: rejected`.
3. Wire caller or UI confirmation only where available; otherwise return a clear rejected tool result.
4. Update tests that currently expect auto-approval.

Verification:

- Unit test: `needsApproval: true` tool does not call `execute`.
- Unit test: explicit approval allows execution once.
- Unit test: rejected tool result is persisted and streamed with `status: rejected`.

### Phase 2: Define the first-party Friday harness

Goal: Friday has its own default harness contract and implementation direction, rather than treating a third-party runtime or copied agent harness as the desired end state.

Steps:

1. Name the default runtime as a Friday-owned harness in docs and configuration.
2. Keep the harness boundary narrow: one prepared run in, one normalized result out.
3. Preserve the existing service-owned responsibilities: provider/model resolution, prompt construction, context assembly, tool policy, stream events, sessions, and persistence.
4. Treat any legacy built-in runtime id as a migration detail, not as the product architecture.
5. Document that plugin or external runtimes may remain extension points, but they are not the primary implementation target for Friday's agent.

Verification:

- Documentation clearly states the default harness is first-party Friday-owned.
- Harness tests cover the Friday-owned default path without depending on a third-party runtime contract.
- No implementation plan step asks to copy another agent harness.

### Phase 3: Make memory and retrieval first-class context

Goal: Normal turns can retrieve relevant workspace memory and session knowledge when it is allowed and useful.

Steps:

1. Add a small context assembly module used by `AgentService.send(...)`.
2. Create a `WorkspaceMemorySearchManager` per run with workspace, session, and visibility settings.
3. Expose `memory_search` and `memory_read` tools, or add a narrow pre-retrieval pass for obvious memory-dependent requests.
4. Keep retrieved text clearly labeled as lower-priority context.

Verification:

- Unit test: relevant `MEMORY.md` content can be retrieved in a normal service send.
- Unit test: disabled memory exposes no memory tools or retrieved context.
- Unit test: unsafe paths and hidden sessions remain inaccessible.

### Phase 4: Unify external capability assembly

Goal: Local tools, connector tools, MCP tools, plugin tools, and deferred tool-search controls enter the run through one policy-aware path.

Steps:

1. Convert executable connector tools into canonical runtime tools before legacy adaptation.
2. Add an adapter from configured MCP/connectors to either local `McpRuntime` or provider-native hosted MCP payloads.
3. Add provider capability metadata for hosted MCP support before attaching provider-native tools.
4. Keep `includeCoreTools: false` only when host tools intentionally supply the local core tool set.

Verification:

- Service-path tests cover connector tools, local MCP tools, hosted MCP tools, and unsupported provider behavior.
- Tool policy tests prove denied tools are absent from both prompt and execution.

### Phase 5: Consolidate per-turn tool selection

Goal: The prompt-visible tool list and executable tool list are selected by the same owner.

Steps:

1. Move final per-turn selection responsibility to `AgentService.send(...)`.
2. Pass selected tools to harnesses as final for the turn.
3. Reduce `runAgent(...)` selection logic to a compatibility fallback for direct test callers.
4. Document the boundary in `docs/harness/index.md` if the contract changes.

Verification:

- Unit test: `AgentService.send(...)` selected tools equal provider tools in the built-in run.
- Unit test: direct `runAgent(...)` callers still get compatible behavior.

### Phase 6: Add final-run reliability signals

Goal: The final response has access to run facts that matter for acceptance criteria.

Steps:

1. Track failed tools, rejected tools, partial outputs, compaction, and unavailable requested capabilities in run metadata.
2. Feed a compact finalization note into the last model turn when these facts exist.
3. Stream or persist the metadata for diagnostics without changing transcript compatibility.

Verification:

- Unit test: a failed tool call is available to the final model turn.
- Unit test: a rejected permission action is disclosed instead of treated as success.
- Unit test: no finalization note is added for clean direct answers.

## Suggested Order

1. Approval enforcement first, because it closes the largest behavioral safety gap.
2. First-party Friday harness definition second, because it anchors the rest of the architecture in our own runtime boundary.
3. Memory/retrieval third, because it directly improves task grounding.
4. MCP/external capability assembly fourth, because it depends on the same permission and tool-policy boundaries.
5. Tool-selection consolidation fifth, once the canonical tool surface is stable.
6. Final reliability signals last, after the run has trustworthy permission and retrieval facts to report.

## Already Verified During This Review

The recent prompt-level acceptance-contract implementation was verified with:

```bash
npm test -- --selectProjects main --runTestsByPath tests/unit/main/agent/system-prompt.test.ts
npm test -- --selectProjects main --runTestsByPath tests/unit/main/agent/service.test.ts
```

A broader accidental main-suite run still showed unrelated existing failures outside this review scope, so this review should not be treated as a full-suite green report.
