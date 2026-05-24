# Agent Harness Implementation Guide

This guide explains how to implement an agent harness in Friday and what design techniques make the harness reliable in production. It combines Friday's current harness implementation with patterns from modern agent runtimes: explicit run boundaries, streaming, cancellation, guardrails, middleware, durable execution, tool schemas, tracing, and context management.

Use this guide when you are adding a new built-in runtime, integrating a plugin-owned runtime, or reviewing whether a feature belongs inside the harness layer.

## Success Criteria

A harness implementation is complete when it can:

- declare exactly which provider/model/runtime combinations it supports
- execute one prepared agent attempt without taking over host-owned state
- stream text, tool, and progress events through the host callbacks
- honor cancellation and run limits
- return a normalized `AgentHarnessAttemptResult`
- stamp or classify results through the lifecycle adapter
- clean up resources without masking the original attempt error
- participate in compaction, reset, and shutdown only when it has real work to do
- provide tests for selection, execution, fallback, and failure behavior

## Mental Model

Think of the harness as an adapter around an execution engine.

The host prepares a stable request:

```text
settings + session + prompt + tools + callbacks + limits + signal
```

The harness converts that request into a runtime-specific run, then converts the runtime-specific outcome back into Friday's stable result:

```text
AgentHarnessAttemptParams -> runtime request -> runtime result -> AgentHarnessAttemptResult
```

The harness should not become a second application service. If it starts resolving user settings, writing sessions directly, deciding UI behavior, or rebuilding global tool policy, the boundary is too wide.

## Implementation Map

| Concern           | Friday source                              | Harness responsibility                                                          |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| Public facade     | `src/main/agent/harness/index.ts`          | Keep outside callers on a narrow agent harness module boundary.                 |
| Contract          | `src/main/agent/harness/types.ts`          | Implement required methods and only meaningful optional methods.                |
| Registration      | `src/main/agent/harness/registry.ts`       | Register one stable runtime id with validation.                                 |
| Policy            | `src/main/agent/harness/policy.ts`         | Respect request/store/default runtime resolution.                               |
| Selection         | `src/main/agent/harness/selection.ts`      | Make `supports(...)` precise enough for forced and auto selection.              |
| Lifecycle         | `src/main/agent/harness/v2.ts`             | Let the adapter handle start/end logging, classification, and cleanup behavior. |
| Built-in fallback | `src/main/agent/harness/builtin-pi.ts`     | Use `pi` as the conservative default path.                                      |
| Plugin activation | `src/main/agent/harness/runtime-plugin.ts` | Match runtime ids to `activation.onAgentHarnesses`.                             |
| Runtime config    | `src/main/agent/harness/runtimes.ts`       | Collect configured non-default harness runtime ids.                             |
| Compaction        | `src/main/agent/compaction.ts`             | Implement `compact(...)` only when runtime-specific compaction is required.     |
| Tool loop         | `src/main/agent/run.ts`                    | Preserve tool events, middleware, hooks, limits, and cancellation semantics.    |

## Step 1: Choose The Runtime Boundary

Start by deciding what the harness owns. Good boundaries are:

- a remote agent runtime
- a local sandboxed coding runtime
- a durable workflow-backed agent engine
- a plugin-provided model/tool orchestration loop
- a provider-specific agent API that does more than raw model streaming

Weak boundaries are:

- a single prompt tweak
- a different default model
- a small tool transformation
- a feature that only affects UI rendering

Those weaker cases usually belong in prompt building, model configuration, tool middleware, or renderer code.

## Step 2: Pick A Stable Runtime Id

Runtime ids are user- and config-visible, so treat them as durable API.

Use:

- lowercase ids
- no whitespace
- names that match the plugin activation hint
- one id per incompatible execution semantics

Avoid:

- provider names unless the harness is truly provider-specific
- version suffixes for ordinary internal changes
- ids that describe implementation details that may disappear

Good examples:

```text
pi
codex
remote-coder
workflow-agent
```

If a breaking behavior change is unavoidable, add a new id and leave the old id in place until callers can migrate.

## Step 3: Implement `supports(...)`

`supports(...)` drives automatic selection and should be conservative. A harness that claims support and then fails inside `runAttempt(...)` makes `auto` mode unpredictable.

Use the context fields:

- `provider`: resolved provider id
- `modelId`: resolved model id
- `requestedRuntime`: selected runtime, usually `auto` during automatic probing

Return:

- `{ supported: true, priority }` when the harness can run the attempt
- `{ supported: false, reason }` when it cannot

Techniques:

- In forced mode, exact id matching happens before `supports(...)`; keep `supports(...)` focused on capability.
- Use priority to rank real quality, not preference alone.
- Keep tie-breaking deterministic by relying on the selector's id sort.
- Include short rejection reasons for diagnostics.
- Do not perform expensive network checks inside `supports(...)`; activation and health checks belong elsewhere.

Example:

```typescript
supports: ({ provider, modelId, requestedRuntime }) => {
	if (requestedRuntime === 'example-runtime') {
		return { supported: true, priority: 100 };
	}
	if (provider !== 'openai') {
		return { supported: false, reason: 'provider_not_supported' };
	}
	if (modelId?.startsWith('gpt-')) {
		return { supported: true, priority: 20 };
	}
	return { supported: false, reason: 'model_not_supported' };
};
```

## Step 4: Keep `runAttempt(...)` Narrow

`runAttempt(...)` should do one thing: execute the prepared attempt.

It should use:

- `params.userMessage` as the new user input
- `params.systemPrompt` as the prepared system context
- `params.session` as the current durable transcript
- `params.tools` and `params.ctx` as the already selected tool surface
- `params.providerAdapter` if the runtime delegates to Friday's provider abstraction
- `params.streamOutput` and `params.streamEvent` for UI-visible progress
- `params.signal` for cancellation
- `params.maxTokens` and `params.maxIterations` as hard run limits

It should return:

- `finalText`
- `toolCalls`
- `usage`
- `stopReason`
- `session`

It should not:

- reload the session from disk
- save the session directly unless the runtime is explicitly responsible for its own isolated state
- bypass tool policy by constructing new privileged tools
- invent a new streaming protocol visible to the renderer
- swallow cancellation and report success
- retry side-effectful operations without idempotency

## Step 5: Stream Events Consistently

Streaming is a contract with the renderer and background task surfaces. Treat it as part of correctness, not decoration.

Use `streamOutput(chunk)` for visible assistant text. Use `streamEvent(event)` for structured state:

- `run_state`
- `reasoning_summary`
- `tool_call_start`
- `tool_call_args_delta`
- `tool_call_input`
- `tool_call_result`
- `text_delta`

Implementation techniques:

- Emit state transitions before expensive work starts.
- Stream final text through the same path as incremental text.
- Preserve tool call ids from the runtime when available.
- For runtime APIs that stream partial tool arguments, buffer enough text to produce valid final JSON.
- If the runtime only produces a final response, emit a minimal state sequence and one text delta.
- Never emit secrets, raw base64 payloads, credentials, or full hidden reasoning.

The important distinction from many framework examples is that Friday needs both user-facing text and operational events. A harness should bridge a runtime's native stream into Friday's event vocabulary.

## Step 6: Honor Cancellation And Limits

Every long-running branch should observe `params.signal`.

At minimum:

- pass `signal` into fetch/API calls that support it
- check `signal.aborted` before each model call and tool call
- stop producing stream events after cancellation
- return `stopReason: 'cancelled'` when cancellation is handled locally
- rethrow abort errors when the host expects the outer service to handle them

Apply limits at the harness boundary even if the runtime has its own controls:

- `maxIterations` limits agent/tool turns
- `maxTokens` limits model output when the provider supports it
- runtime-specific turn limits should be stricter, never looser, than host limits

This follows the same production lesson exposed by agent SDKs that make stream mode, max turns, cancellation signals, sessions, and tracing explicit run options.

## Step 7: Normalize Tool Use

Tools are where harnesses most often leak runtime details. Keep the tool contract explicit.

Recommended pattern:

1. Convert Friday `AgentTool` definitions into the runtime's tool schema.
2. Preserve tool names exactly unless the runtime requires namespacing.
3. Validate model-produced arguments before execution.
4. Execute through Friday's selected tool surface and `ToolContext`.
5. Convert tool results back into Friday `ToolResultBlock[]`.
6. Run tool-result middleware if the built-in loop is not handling the tool call.
7. Emit tool start, input, result, and hook events.
8. Persist only sanitized, bounded tool results.

Tool implementation tricks:

- Prefer fewer, clearer tools over many overlapping wrappers.
- Name tools by the task they enable, not the backend endpoint they call.
- Return high-signal context, not raw database/API dumps.
- Include enough metadata for the agent to decide the next step.
- Add pagination and filtering controls before large result sets are needed.
- Make destructive tools visibly different from read-only tools.
- Use absolute paths or stable resource ids when the runtime can change working directory.
- Record both machine-readable details and concise text summaries when possible.

These techniques come from current tool-design guidance for agent systems: tools are not ordinary internal functions; they are contracts between deterministic software and a non-deterministic caller.

## Step 8: Add Guardrails At The Correct Boundary

Guardrails work best when they match the thing being guarded.

Use:

- request/input guards before the harness starts
- tool guards around every tool invocation
- output guards before final text is returned or delivered
- runtime selection guards before plugin activation if a runtime is restricted

Avoid relying only on a final output guard when the risky behavior is a tool action. In multi-agent or delegated workflows, final-agent output checks do not necessarily inspect every intermediate tool call. Tool-level checks are the safer boundary for file writes, network calls, external messages, payments, account changes, or destructive operations.

Friday already has before-run hooks, tool management, harness hooks, and tool-result middleware surfaces. A harness should reuse those surfaces rather than inventing private policy paths.

## Step 9: Design For Context Pressure

Agent harnesses should treat context as finite. Long-running agents produce transcripts, tool outputs, reasoning summaries, retrieved documents, and status notes that can eventually degrade model performance.

Techniques:

- Keep static instructions in the system prompt, not repeated user messages.
- Use structured sections for prompt inputs.
- Keep tool descriptions clear and non-overlapping.
- Return references first and full content only when needed.
- Prefer just-in-time retrieval over preloading large data.
- Keep stable ids, paths, URLs, and query handles in context so the agent can reload details later.
- Compact old transcript segments before provider context overflow forces an emergency recovery.
- Remove or summarize stale tool results after their facts have been incorporated.
- Preserve decisions, unresolved problems, file paths, commands, and user constraints during compaction.

If the harness implements `compact(...)`, it should maximize recall first, then improve precision. Over-aggressive compaction is worse than carrying a little redundant context because missing context can silently corrupt later decisions.

## Step 10: Plan Durable Execution Carefully

Not every harness needs durable execution. When it does, durability must be designed rather than sprinkled over the run loop.

Use durable execution for:

- background tasks that survive app restarts
- long-running workflows
- human approval pauses
- remote agent jobs
- expensive multi-step work with recoverable checkpoints

Core rules:

- Store a stable run id and session key.
- Persist completed steps before moving to the next non-idempotent step.
- Make side effects idempotent with operation ids.
- Do not blindly replay file writes, API mutations, external messages, or payment-like actions.
- Wrap non-deterministic and side-effectful operations as separately recorded tasks.
- On resume, rebuild runtime state from checkpoints and session history rather than assuming process memory survived.
- Persist pending human-in-the-loop interrupts in a form the UI can reconstruct.

Durable orchestration systems and LangGraph-style persistence both emphasize the same point: replay is only safe when non-deterministic operations and side effects are isolated.

## Step 11: Use The Lifecycle Adapter

Friday's V2 lifecycle is:

```text
prepare -> start -> send -> resolveOutcome -> cleanup
```

Current harnesses implement the simpler V1 contract. The adapter supplies no-op `prepare`, `start`, and `cleanup`, then calls `runAttempt(...)`.

Use the adapter rather than bypassing it because it centralizes:

- `before_agent_start` hook dispatch
- started/completed/error logging
- result classification
- `agentHarnessId` stamping
- cleanup behavior
- preservation of original attempt errors when cleanup also fails

If Friday later exposes native V2 harness registration, implement `prepare` for runtime allocation, `start` for creating a session/run handle, `send` for execution, `resolveOutcome` for normalization, and `cleanup` for best-effort resource release.

## Step 12: Implement Optional Methods Deliberately

Optional methods should signal real capability.

`classify(result, ctx)`:

- Use for labels such as `complete`, `needs_review`, `blocked`, or runtime-specific outcome classes.
- Do not mutate the result in place.
- Keep classification cheap and deterministic.

`compact(params)`:

- Use only when the runtime has a better compaction mechanism than the native path.
- Return `undefined` when the runtime chooses not to compact.
- Preserve enough metadata for session markers and future debugging.

`runSideQuestion(params)`:

- Use for quick runtime-owned clarification or side-channel checks.
- Do not let it mutate main session state unless the contract is expanded.

`reset(params)`:

- Clear per-session runtime state.
- Isolate failures so one harness does not prevent other harnesses from resetting.

`dispose()`:

- Close process handles, sockets, sandboxes, watchers, and remote sessions.
- Treat shutdown cleanup as best-effort.

`deliveryDefaults`:

- Declare preferences only; do not assume every delivery path consumes them yet.

## Step 13: Register From A Plugin Runtime

A plugin-owned harness should be registered from the plugin runtime entry after activation.

Minimal runtime entry shape:

```typescript
export default function activate(api: { registerAgentHarness(harness: AgentHarness): void }) {
	api.registerAgentHarness(exampleHarness);
}
```

Manifest activation should include the runtime id:

```json
{
	"id": "example-runtime-plugin",
	"name": "Example Runtime",
	"description": "Example agent harness runtime.",
	"activation": {
		"onAgentHarnesses": ["example-runtime"]
	},
	"runtimeEntry": "./dist/index.js"
}
```

Registration techniques:

- Keep the manifest runtime hint and harness `id` aligned.
- Fail activation loudly when required runtime dependencies are missing.
- Register once per plugin activation.
- Avoid dynamic ids; they make config, diagnostics, and tests brittle.
- Do not register a harness before its required runtime assets are available.

## Step 14: Add Observability

A harness should make runs explainable without exposing sensitive data.

Log or trace:

- selected harness id and reason
- runtime source: request, store, or default
- provider and model
- support candidates and rejection reasons
- run id and session id
- lifecycle phase
- duration
- stop reason
- tool counts and error counts
- classification

Do not log:

- API keys
- secrets
- raw credentials
- full hidden reasoning
- unbounded tool output
- raw image/audio/file payloads

Tracing techniques:

- Add high-cardinality details carefully.
- Attach important attributes when the span is created, so sampling can use them.
- Propagate trace ids through remote runtime calls.
- Represent model calls, tool calls, guardrails, handoffs, and custom runtime events as child spans or structured log events.
- Let deployments disable sensitive input/output capture while preserving operational spans.

## Step 15: Handle Errors With Stable Semantics

Normalize failures so callers can reason about them.

Use these categories:

- activation failure: plugin/runtime cannot be loaded
- selection failure: forced runtime is not registered
- provider failure: model API error
- tool failure: tool returned an error or rejected call
- policy failure: guardrail or before-run hook blocked execution
- context failure: provider context overflow
- cancellation: user or timeout aborted run
- runtime failure: harness engine crashed or returned invalid state

Techniques:

- Let forced runtime errors be explicit.
- Let `auto` fallback to `pi` only when no registered harness supports the run, not when a selected harness crashes mid-run.
- Preserve the original error when cleanup fails.
- Convert known cancellation errors to `cancelled`.
- Keep user-facing error labels concise.
- Put diagnostic detail in logs, not final assistant text.

## Step 16: Security And Isolation

Harnesses often integrate the most powerful runtime surfaces. Treat them as high-risk extension points.

Checklist:

- Validate plugin manifests before loading runtime entries.
- Restrict activation to matching runtime hints.
- Keep tool policy host-owned.
- Pass the existing `ToolContext`; do not manufacture broader permissions.
- Sandbox external process runtimes where possible.
- Enforce workspace path boundaries.
- Redact secrets from logs and stream events.
- Require approval or policy checks for destructive tools.
- Bound tool result sizes before persistence and streaming.
- Prefer allowlists over blocklists for runtime capabilities.
- Treat remote runtime output as untrusted until normalized.

If a plugin harness can execute code, access files, call networks, or send messages, document that explicitly in the plugin manifest and setup flow.

## Step 17: Test The Harness

Start with unit tests around the contract and selection logic.

Required tests:

- forced `pi` selects the built-in harness
- forced plugin runtime selects the exact registered harness
- missing forced runtime throws a clear error
- `auto` chooses the highest-priority supported harness
- equal priorities tie-break by id
- `auto` falls back to `pi` when nothing supports the run
- lifecycle stamps `agentHarnessId`
- `classify(...)` is called and stored
- cleanup runs after success
- cleanup runs after failure without masking the original error
- reset failures are isolated
- compaction delegates to `compact(...)` when available

Execution tests:

- stream text output
- emit tool events
- honor `AbortSignal`
- stop at max iterations
- preserve session updates
- normalize usage
- surface tool errors without crashing the whole run unless policy requires it

Evaluation tests:

- realistic tasks that require multiple tool calls
- expected final outcomes, not only exact wording
- expected or forbidden tool-use patterns when those matter
- metrics for tool count, runtime, token use, errors, and cancellations
- held-out tasks so prompt/tool tweaks do not overfit the first test set

## Step 18: Review Before Shipping

Use this checklist in code review:

- The harness has a stable id and label.
- `supports(...)` is conservative and cheap.
- `runAttempt(...)` does not reload or save host-owned session state directly.
- Streaming uses Friday's callbacks.
- Cancellation is wired through every long operation.
- Tool execution respects selected tools and `ToolContext`.
- Tool results are sanitized and bounded.
- Errors have stable semantics.
- Optional methods represent real capabilities.
- Plugin activation hints match the harness id.
- Logs are useful and do not leak sensitive data.
- Tests cover selection, lifecycle, failure, and cancellation.
- Documentation names any runtime-specific security implications.

## Common Failure Modes

### Harness Claims Too Much Support

Symptom: `auto` selects the harness and then fails inside `runAttempt(...)`.

Fix: make `supports(...)` stricter and add rejection reasons. Keep network health checks outside selection.

### Harness Owns Too Much State

Symptom: session persistence, UI state, or tool policy behaves differently per runtime.

Fix: move host-owned behavior back to `AgentService`, prompt building, session store, or tool management.

### Tool Results Blow Up Context

Symptom: long tasks degrade or hit context overflow after several tool calls.

Fix: summarize or paginate large results, store references, clear stale tool outputs, and tune compaction.

### Cancellation Is Cosmetic

Symptom: UI says cancelled but the remote runtime keeps working.

Fix: propagate `AbortSignal` to remote calls, close streams, and cancel remote jobs when the runtime supports it.

### Durable Resume Repeats Side Effects

Symptom: after restart, the harness repeats a write, sends a duplicate message, or calls an API twice.

Fix: persist operation ids and completed task results before advancing. Make side-effecting operations idempotent.

### Guardrails Run Too Late

Symptom: final output is safe, but an unsafe tool action already happened.

Fix: put checks around tool invocation and runtime selection, not only final output.

### Observability Is Too Verbose Or Too Sparse

Symptom: logs either leak raw data or cannot explain why a runtime was selected.

Fix: log selection metadata, lifecycle phases, counts, durations, and classifications; redact payloads.

## Friday-Specific Implementation Skeleton

```typescript
import type {
	AgentHarness,
	AgentHarnessAttemptParams,
	AgentHarnessAttemptResult,
} from '../../agent/harness/types';

function assertNotAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException('Agent run cancelled.', 'AbortError');
	}
}

export function createExampleHarness(): AgentHarness {
	return {
		id: 'example-runtime',
		label: 'Example Runtime',
		supports: ({ provider, requestedRuntime }) => {
			if (requestedRuntime === 'example-runtime') return { supported: true, priority: 100 };
			if (provider === 'openai') return { supported: true, priority: 10 };
			return { supported: false, reason: 'unsupported_provider' };
		},
		async runAttempt(params) {
			return runExampleAttempt(params);
		},
		classify: (result) => {
			if (result.stopReason === 'cancelled') return 'cancelled';
			if (result.stopReason === 'error') return 'failed';
			return 'complete';
		},
	};
}

async function runExampleAttempt(
	params: AgentHarnessAttemptParams
): Promise<AgentHarnessAttemptResult> {
	assertNotAborted(params.signal);
	params.streamEvent?.({ type: 'run_state', state: 'running', label: 'Example runtime' });

	const runtimeResult = await callExampleRuntime({
		model: params.model,
		systemPrompt: params.systemPrompt,
		message: params.userMessage,
		session: params.session,
		tools: params.tools,
		signal: params.signal,
		onText: (chunk) => params.streamOutput?.(chunk),
	});

	assertNotAborted(params.signal);
	return {
		finalText: runtimeResult.text,
		toolCalls: runtimeResult.toolCalls,
		usage: runtimeResult.usage,
		stopReason: runtimeResult.stopReason,
		session: runtimeResult.session,
	};
}
```

## External References Used

- [OpenAI Agents SDK: running agents](https://openai.github.io/openai-agents-js/guides/running-agents/) for explicit run options such as streaming, context, max turns, cancellation, sessions, guardrails, tracing, and sandbox configuration.
- [OpenAI Agents SDK: guardrails](https://openai.github.io/openai-agents-python/guardrails/) for placing input, output, and tool guardrails at the correct workflow boundaries.
- [OpenAI Agents SDK: tracing](https://openai.github.io/openai-agents-python/tracing/) for tracing model calls, tools, handoffs, guardrails, and custom events during an agent run.
- [LangChain agents](https://docs.langchain.com/oss/python/langchain/agents) for middleware as an execution-stage extension pattern.
- [LangChain streaming](https://docs.langchain.com/oss/python/langchain/streaming) for separating progress, token, tool, and custom streaming projections.
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) and [durable execution](https://langchain-5e9cc07a.mintlify.app/oss/python/langgraph/durable-execution) for persistence, resume, determinism, idempotency, and side-effect isolation.
- [Model Context Protocol tools](https://modelcontextprotocol.io/specification/2024-11-05/server/tools) for tool schemas as model-controlled interfaces to external systems.
- [OpenTelemetry Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/) for span attributes, links, and sampling-aware trace metadata.
- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) for keeping agent systems simple, transparent, and tool-centered.
- [Anthropic: Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) for tool ergonomics, evaluation-driven tool design, namespacing, context-rich responses, and token efficiency.
- [Anthropic: Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) for context curation, just-in-time retrieval, compaction, and structured memory.
