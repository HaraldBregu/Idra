# Agent Harnesses

An agent harness is the execution boundary around an AI agent run. It is the layer that receives a prepared agent request, decides whether a specific runtime can handle it, runs the attempt, normalizes the result, and performs lifecycle work such as classification, cleanup, compaction, reset, or disposal.

In Friday, the built-in `pi` harness keeps the normal provider-native agent loop. Plugin harnesses can replace that loop for specific runtimes while keeping the rest of Friday's agent surface stable: sessions, tools, provider settings, streaming, cancellation, logging, and persistence.

## Why Harnesses Matter

AI agent runtimes tend to grow in several directions at once: different model providers, local and remote tool runners, background execution, memory compaction, plugin hooks, and alternate orchestration engines. Without a harness boundary, each new runtime usually leaks conditionals into the core agent loop.

A harness gives the application one stable execution contract. The core app prepares the same inputs and expects the same result shape, while each harness owns the runtime-specific details. This makes it possible to:

- add plugin-owned agent runtimes without forking the main service
- keep provider/model resolution, tool selection, session persistence, and stream events consistent
- select runtimes explicitly or automatically based on model/provider support
- isolate lifecycle behavior such as cleanup, reset, dispose, and compaction
- annotate results with runtime metadata for debugging and observability
- keep the default built-in agent path simple while allowing deeper runtime experiments

Harnesses are most useful when an application needs more than one execution strategy. They are less useful for a single hardcoded agent loop with no plugin, runtime, or deployment variation.

## What A Harness Owns

A harness should own runtime behavior, not global application state.

The host application should still own:

- user and workspace settings
- provider and model resolution
- session loading and saving
- system prompt construction
- tool policy and tool selection
- IPC, UI events, and task orchestration

The harness should own:

- deciding whether it supports a run
- adapting the host request to its runtime
- executing one agent attempt
- returning a normalized result
- optional result classification
- optional runtime-specific compaction
- optional reset and shutdown cleanup

This split keeps the main service responsible for product behavior and lets harnesses focus on execution behavior.

## Core Contract

Friday's current harness contract lives in `src/main/agent/harness/types.ts`. A registered harness must provide:

- `id`: stable runtime id, such as `pi` or a plugin runtime id
- `label`: human-readable name for logs and diagnostics
- `supports(context)`: returns whether the harness supports the provider/model/runtime request
- `runAttempt(params)`: executes one agent attempt and returns a normalized agent result

Optional capabilities include:

- `classify(result, ctx)`: annotates the completed result
- `compact(params)`: performs runtime-specific transcript compaction
- `runSideQuestion(params)`: answers a side question through the harness
- `reset(params)`: responds to session or agent reset
- `dispose()`: releases runtime resources during shutdown
- `deliveryDefaults`: declares delivery preferences for future message routing behavior

The attempt params include the resolved provider, model, user message, system prompt, active session, selected tools, tool context, provider adapter, stream callbacks, run hooks, cancellation signal, and run limits.

## Selection Model

Harness selection should be deterministic and explainable. Friday uses this precedence:

1. Runtime requested on the current send call with `agentRuntime` or `agentHarnessId`.
2. Runtime stored in the agent model-module options.
3. Default `auto`.

Selection then follows these rules:

- `pi` forces the built-in harness.
- Any other explicit runtime must activate and register a plugin harness with the same id.
- `auto` probes registered plugin harnesses with `supports(...)`.
- Supported plugin harnesses are sorted by priority, then by id.
- If no plugin harness supports the run, Friday falls back to `pi`.

This keeps explicit selection strict and automatic selection forgiving.

## Runtime Flow

The host prepares the run before the harness starts. In Friday, `AgentService.send(...)` resolves the provider and model, loads the session, builds prompt context, selects tools, creates stream callbacks, and then calls `runAgentHarnessAttempt(...)`.

The lifecycle adapter wraps the selected harness in a consistent flow:

```text
prepare -> start -> send -> resolveOutcome -> cleanup
```

Current V1 harnesses only implement `runAttempt(...)`; the adapter supplies no-op prepare/start/cleanup phases. `resolveOutcome` stamps every result with `agentHarnessId` and applies optional result classification. Cleanup runs after both successful and failed attempts. If cleanup fails after an attempt error, the original attempt error is preserved and the cleanup failure is logged.

## How To Implement A Harness

Use the smallest harness that can honestly own the runtime-specific behavior.

1. Define the runtime id.

   Pick a lowercase stable id. It should match the plugin activation hint when the harness is plugin-owned.

2. Implement `supports(...)`.

   Return `supported: true` only for provider/model/runtime combinations the harness can actually run. Use `priority` to let automatic selection choose among multiple compatible harnesses.

3. Implement `runAttempt(...)`.

   Convert Friday's attempt params into the runtime's request, stream output through the provided callbacks, honor `signal`, and return the normalized `AgentHarnessAttemptResult`.

4. Register the harness from the runtime entry.

   Plugin runtimes register through `registerAgentHarness(...)`. The same registration is written to Friday's plugin registry and the global harness registry.

5. Add optional lifecycle methods only when they have real behavior.

   Do not add placeholder `compact`, `reset`, or `dispose` methods. An omitted method is clearer than a no-op capability.

6. Test selection and lifecycle behavior.

   Cover explicit selection, auto support priority, fallback behavior, result stamping, classification, reset isolation, and compaction if implemented.

## Minimal Shape

```typescript
import type { AgentHarness } from '../src/main/agent/harness/types';

export const exampleHarness: AgentHarness = {
	id: 'example-runtime',
	label: 'Example Runtime',
	supports: ({ provider, requestedRuntime }) => {
		if (requestedRuntime === 'example-runtime') {
			return { supported: true, priority: 100 };
		}
		return { supported: provider === 'openai', priority: 10 };
	},
	async runAttempt(params) {
		const result = await runExampleAgent({
			message: params.userMessage,
			systemPrompt: params.systemPrompt,
			session: params.session,
			tools: params.tools,
			signal: params.signal,
			onText: params.streamOutput,
		});

		return {
			finalText: result.text,
			toolCalls: result.toolCalls,
			usage: result.usage,
			stopReason: result.stopReason,
			session: result.session,
		};
	},
};
```

## Plugin Activation

Plugin-owned harnesses should be discoverable before selection. Friday's activation planner can select plugins by `activation.onAgentHarnesses`. For a forced non-`pi` runtime, Friday activates matching plugin runtime entries before selection and then requires a registered harness with the requested id.

Configured non-default runtimes can also be activated during bootstrap. Friday's runtime collector supports `FRIDAY_AGENT_RUNTIME` plus nested `agentRuntime`, `agentHarnessId`, and `agentHarnessRuntime` config keys. Current bootstrap supplies the environment value and the stored `agentRuntime` preference.

## Compaction And Hooks

Harnesses can implement `compact(...)` when transcript reduction needs to happen inside the selected runtime. During compaction, Friday first delegates to the selected harness when a requested or stored runtime is active and the harness supports compaction. If the selected harness is `pi` or has no `compact(...)`, Friday uses the native summarization path.

Friday also defines hook helper surfaces for LLM input/output, agent-end, prompt/agent-start, compaction, tool-call, and message-write events. The compaction hooks are wired into the native compaction path. Other helper call sites are extension points until the main run loop wires them.

## Design Rules

- Keep the harness boundary narrow: one prepared run in, one normalized result out.
- Keep host-owned behavior in the host: settings, sessions, tools, prompts, UI events, and persistence should not move into plugin harnesses.
- Make explicit runtime selection strict so configuration mistakes fail visibly.
- Make automatic selection safe by falling back to the built-in harness.
- Prefer omitted optional methods over no-op methods.
- Treat cleanup as best-effort after an attempt failure.
- Add diagnostics at the selection and lifecycle boundaries.

## Current Friday Source

- `src/main/agent/harness/types.ts`: harness contract
- `src/main/agent/harness/registry.ts`: registration, reset, and dispose helpers
- `src/main/agent/harness/policy.ts`: request/store/default runtime resolution
- `src/main/agent/harness/selection.ts`: selection, dispatch, and harness-aware compaction
- `src/main/agent/harness/v2.ts`: lifecycle adapter and result classification
- `src/main/agent/harness/builtin-pi.ts`: built-in fallback harness
- `src/main/agent/harness/activation.ts`: runtime activation state
- `src/main/agent/harness/runtime-plugin.ts`: plugin discovery and runtime activation
- `src/main/agent/harness-runtimes.ts`: configured runtime collection
- `src/main/service.ts`: `AgentService.send(...)` dispatch through the harness layer

## Related Docs

- [Plugins and agent harnesses](../features/plugins-and-agent-harnesses.md)
- [Agent harness implementation progress](../agent-harness-implementation-progress.md)
- [Historical implementation plan](../agent-harness-implementation-plan.md)
- [Historical OpenClaw scrape and gap plan](../agent-harness-openclaw-scrape.md)
