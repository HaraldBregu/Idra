# Plugins And Agent Harnesses

Plugins let Friday discover extension manifests and activate runtime surfaces for providers, channels, tools, hooks, setup flows, model metadata, and agent harnesses.

## Plugin Manifests

Plugin manifests are `friday.plugin.json` files. The loader normalizes fields such as:

- plugin id, name, description, kind, and enabled-by-default state
- providers and channels owned by the plugin
- provider and channel environment variables
- provider auth choices and command aliases
- skills, UI hints, config schema, setup entries, and runtime entries
- model support, model catalogs, pricing, endpoints, and request metadata
- tool, web, speech, realtime, memory, media, migration, and hook contracts

Discovery scans bundled, installed, and workspace roots, ignores build/cache directories, enforces a maximum scan depth, blocks unsafe path escapes, and rejects suspicious permissions or ownership where relevant.

## Activation

The activation planner can select plugins by provider, channel, command, route, tool, capability, or agent harness runtime. Plugin entries are loaded only when the trigger matches their manifest hints or owned surfaces.

## Agent Harnesses

An agent harness is the execution adapter around a Friday agent turn. The built-in `pi` harness keeps the normal provider-native run loop, while plugin harnesses can replace the attempt runner for a specific runtime.

Harness selection uses this precedence:

1. Runtime requested on the current send call with `agentRuntime` or `agentHarnessId`.
2. Runtime stored in the agent model-module options.
3. Default `auto`.

Selection behavior:

- the built-in `pi` harness
- plugin-registered harnesses
- forced runtime selection
- automatic plugin selection based on provider/model support
- fallback to the built-in harness when no plugin harness supports the run
- harness-specific compaction when the selected harness supports it

For a forced non-`pi` runtime, Friday activates the matching plugin runtime and then requires a registered harness with the same id. For `auto`, Friday probes registered plugin harnesses with `supports({ provider, modelId, requestedRuntime })`, chooses the highest priority supported harness, uses the harness id as a tie-breaker, and falls back to `pi`.

## Harness Contract

Plugins register harnesses through `registerAgentHarness(...)`. A harness must provide:

- `id` and `label`
- `supports(context)`
- `runAttempt(params)`

Optional capabilities include:

- `classify(result, ctx)`, which annotates completed results
- `compact(params)`, which can handle transcript compaction for the selected runtime
- `runSideQuestion(params)`
- `reset(params)` and `dispose()`
- `deliveryDefaults`

The attempt params include the resolved provider, model, user message, system prompt, current session, selected tools, tool context, provider adapter, stream callbacks, run hooks, cancellation signal, and token/iteration limits.

## Runtime Flow

`AgentService.send(...)` resolves provider/model settings, loads the session, builds tools and prompt context, then calls `runAgentHarnessAttempt(...)`. The lifecycle adapter wraps the selected harness with:

```text
prepare -> start -> send -> resolveOutcome -> cleanup
```

`resolveOutcome` stamps every result with `agentHarnessId` and applies the optional classification. Cleanup runs after both successful and failed attempts; cleanup failures after an attempt error are logged without masking the original error.

Configured non-default harness runtimes are activated during bootstrap and again before harness attempts. Bootstrap scans `FRIDAY_AGENT_RUNTIME` and stored agent options for `agentRuntime`, `agentHarnessId`, or `agentHarnessRuntime`; per-send selection still comes from the request override or stored preference.

## Compaction And Hooks

Transcript compaction fires `before_compaction` and `after_compaction` hook notifications. When a requested or stored runtime is active, compaction first delegates to the selected harness if it implements `compact(...)`; otherwise the built-in native summarization path runs.

The harness hook runner and helper payloads exist for LLM input/output, agent-end, prompt/agent-start, compaction, tool-call, and message-write events. The compaction hooks are wired into the current native compaction path; other helper call sites should be treated as extension points until the main run loop wires them.

## Current Limits

- `auto` mode only considers harnesses that are already registered by the time selection runs.
- Explicit non-`pi` runtime selection fails if no matching plugin manifest or runtime entry can be activated.
- `deliveryDefaults` is part of the harness type but is not currently consumed by the message delivery path.
- Tool result middleware helpers exist, but the main tool execution path does not yet run them for every tool result.

## Tests

- `tests/unit/main/agent/harness-core.test.ts`
- `tests/unit/main/agent/runtime-plugin.test.ts`

## Source

- `src/main/plugins`
- `src/main/agent/harness`
- `src/main/agent/harness-runtimes.ts`
- `src/main/bootstrap.ts`
- Existing docs: `docs/agent-harness-implementation-plan.md`, `docs/agent-harness-implementation-progress.md`
