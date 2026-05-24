# Agent Harness: OpenClaw Scrape & Gap Plan

Scraped from `/Users/haraldbregu/Documents/analyze/openclaw` on 2026-05-23.
Cross-referenced against Friday's existing harness implementation.

Status: historical scrape and gap plan. Several gap items below have since been closed; use `docs/agent-harness-implementation-progress.md` and `docs/features/plugins-and-agent-harnesses.md` as the current source of truth.

---

## 1. OpenClaw Harness Architecture (scraped)

### File map

```
src/agents/harness/
  types.ts                     — AgentHarness interface + all param/result types
  registry.ts                  — Global Symbol-keyed registry (register/list/get/clear/reset/dispose)
  policy.ts                    — Runtime resolution: config → provider → model → agentId → default
  selection.ts                 — Harness selection + runAgentHarnessAttempt + maybeCompactAgentHarnessSession
  result-classification.ts     — Applies harness.classify() into result, stamps agentHarnessId
  v2.ts                        — V2 lifecycle adapter: prepare→start→send→resolve→cleanup + diagnostics
  builtin-pi.ts                — Built-in "pi" fallback harness (always supported, priority 0)
  hook-context.ts              — AgentHarnessHookContext + buildAgentHookContext(params)
  hook-helpers.ts              — after_tool_call + before_message_write plugin hook integration
  lifecycle-hook-helpers.ts    — llm_input, llm_output, agent_end, before_agent_finalize hooks
                                 (includes finalize-retry budget with SHA-256 key + 2048 entry cap)
  prompt-compaction-hook-helpers.ts — before_prompt_build / before_agent_start + before/after_compaction
  tool-result-middleware.ts    — Per-tool-result middleware pipeline with content/size validation
  runtime-plugin.ts            — ensureSelectedAgentHarnessPlugin: activates codex plugin if needed
src/agents/harness-runtimes.ts — collectConfiguredAgentHarnessRuntimes: reads all runtimes from config
```

### Interface contract (`types.ts`)

```typescript
AgentHarness {
  id: string
  label: string
  pluginId?: string
  deliveryDefaults?: AgentHarnessDeliveryDefaults  // sourceVisibleReplies?: 'automatic'|'message_tool'
  supports(ctx): AgentHarnessSupport                // required
  runAttempt(params): Promise<Result>               // required
  runSideQuestion?(params): Promise<{ text }>       // optional
  classify?(result, ctx): Classification | undefined // optional — stamp result
  compact?(params): Promise<Result | undefined>     // optional — context compaction
  reset?(params): Promise<void>|void                // optional — session reset hook
  dispose?(): Promise<void>|void                    // optional — shutdown hook
}
```

### V2 Lifecycle (`v2.ts`)

```
prepare → start → send → resolveOutcome → cleanup
                  ↑ rawResult stored      ↑ always runs, even on error
```

- Each phase transition emits `harness.run.started` / `harness.run.completed` / `harness.run.error` diagnostic events.
- Cleanup always runs; cleanup errors after an attempt failure are logged but do **not** mask the original error.
- `resolveOutcome` calls `applyAgentHarnessResultClassification` (stamps `agentHarnessId` + optional classification).
- V2 wraps V1 harnesses via `adaptAgentHarnessToV2` — V1 harnesses get no-op prepare/start/cleanup.

### Selection logic (`selection.ts`)

Priority order:

1. `runtime === 'pi'` → force built-in PI
2. `runtime !== 'auto'` → force exact plugin by id, throw if not registered
3. `runtime === 'auto'` → probe all plugin harnesses via `supports()`, sort by priority desc + id asc; fallback to PI

Reasons: `forced_pi`, `forced_plugin`, `auto_plugin`, `auto_pi`.

### Plugin hook system (OpenClaw-specific, complex)

OpenClaw fires plugin hooks at these harness points:

- **`llm_input`** — before LLM call, fire-and-forget
- **`llm_output`** — after LLM call, fire-and-forget
- **`agent_end`** — after full agent run, fire-and-forget
- **`before_agent_finalize`** — may return `revise | finalize | continue`; has a per-runId retry budget (SHA-256 key, max 2048 entries) to prevent infinite retries
- **`before_prompt_build` / `before_agent_start`** — can prepend context, prepend/append system context, override system prompt
- **`before_compaction` / `after_compaction`** — notification hooks around context compaction
- **`after_tool_call`** — fires after each tool execution
- **`before_message_write`** — can block/transform outgoing messages

### Tool result middleware (`tool-result-middleware.ts`)

Chain of `AgentToolResultMiddleware` handlers per runtime. Each handler receives the current result
and may return a new one. Validation bounds:

- max 200 content blocks
- text block ≤ 100,000 chars
- image data ≤ 5,000,000 chars
- details JSON ≤ 100,000 bytes, depth ≤ 20, keys ≤ 1,000

If any handler returns an invalid result or throws, the chain returns a hard-coded error result.
Incoming `details` on raw tool results is sanitized (cycle-safe JSON round-trip) before the chain runs.

---

## 2. Friday State At Initial Scrape

### Implemented (complete)

| File                                   | Status                                              |
| -------------------------------------- | --------------------------------------------------- |
| `src/main/agent/harness/types.ts`      | Done — full contract matches OpenClaw shape         |
| `src/main/agent/harness/registry.ts`   | Done — global Symbol registry, validate on register |
| `src/main/agent/harness/policy.ts`     | Done — request > store > default                    |
| `src/main/agent/harness/selection.ts`  | Done — forced + auto + pi fallback                  |
| `src/main/agent/harness/v2.ts`         | Done — prepare→start→send→resolve→cleanup           |
| `src/main/agent/harness/builtin-pi.ts` | Done — delegates to existing `runAgent`             |
| `src/main/service.ts`                  | Done — routes through `runAgentHarnessAttempt`      |
| Plugin `registerAgentHarness` surface  | Done — `api-builder.ts` wired                       |
| Store runtime preference accessors     | Done — `store/service.ts`                           |
| Reset + dispose lifecycle hooks        | Done — wired in `service.ts` and `bootstrap.ts`     |

### Initial Gaps vs OpenClaw

#### G-1 — `registry.ts` import bug (immediate fix)

`resetRegisteredAgentHarnesses` uses `AgentHarnessResetParams` but the type is not imported.
TypeScript catches this at compile time; fix is one-line import addition.

#### G-2 — `v2.ts` missing `classify` application

`resolveOutcome` in Friday's V2 adapter returns `result` unchanged.
OpenClaw's V2 calls `applyAgentHarnessResultClassification`, which:

- stamps `agentHarnessId` on every result
- calls `harness.classify(result, params)` and stores the classification when non-null

Without this, plugin harnesses that implement `classify()` have no effect, and `agentHarnessId` is never set on results.

#### G-3 — `v2.ts` missing diagnostic events

OpenClaw emits structured `harness.run.started`, `harness.run.completed`, `harness.run.error` events for telemetry.
Friday currently only logs at the selection layer. No run-lifecycle events are emitted.

#### G-4 — `harness/hook-context.ts` missing

`AgentHarnessHookContext` and `buildAgentHookContext()` are the typed bridge between harness run params and the plugin hook system. Missing in Friday. Needed if/when Friday adds plugin hooks.

#### G-5 — Plugin hook integration missing entirely

OpenClaw wires plugin hooks at multiple harness points (`llm_input`, `llm_output`, `agent_end`, `before_agent_finalize`, `before_prompt_build`, `before_compaction`, `after_tool_call`, `before_message_write`).
Friday has no plugin hook runner; none of these are wired. Not blocking for core harness correctness but is a capability gap for plugin extensibility.

#### G-6 — Tool result middleware missing

`harness/tool-result-middleware.ts` — the per-runtime tool result transformation pipeline — has no equivalent in Friday. Plugin harnesses registered via the plugin API cannot currently post-process tool results.

#### G-7 — `maybeCompactAgentHarnessSession` not exposed

OpenClaw's `selection.ts` exports `maybeCompactAgentHarnessSession` so the compaction path can delegate to the active harness's `compact()` method.
Friday has `compact?()` on the interface and `compaction.ts` in the agent folder, but there is no call path that routes compaction through the selected harness.

#### G-8 — Plugin activation for harness not wired

OpenClaw's `runtime-plugin.ts` calls `ensurePluginRegistryLoaded` for the codex plugin when `policy.runtime === 'codex'`.
Friday has the `onAgentHarnesses` manifest hook and the activation planner, but harness selection does not trigger plugin loading. If a plugin that provides a harness hasn't been loaded yet, selection will silently fall through to `pi`.

#### G-9 — `harness-runtimes.ts` equivalent missing

OpenClaw has `collectConfiguredAgentHarnessRuntimes(config, env)` to enumerate all runtime IDs referenced in config (providers, model entries, agent entries). This is used at startup to pre-load plugin runtimes. Friday has no equivalent.

#### G-10 — `deliveryDefaults` not in Friday types

`AgentHarness.deliveryDefaults?: { sourceVisibleReplies?: 'automatic' | 'message_tool' }` is on the OpenClaw interface but not on Friday's. Low priority but a parity gap.

---

## 3. Implementation Plan (prioritized)

### Priority 1 — Correctness fixes (do first)

**P1-A: Fix `registry.ts` import bug**

- File: `src/main/agent/harness/registry.ts`
- Add `AgentHarnessResetParams` to the import from `./types`.
- Verify: `tsc` passes.

**P1-B: Apply `classify()` in `v2.ts` `resolveOutcome`**

- File: `src/main/agent/harness/v2.ts`
- Add a standalone `applyAgentHarnessResultClassification` helper (extract from `resolveOutcome` or add alongside).
- `resolveOutcome` should:
  1. If `harness.classify` is undefined → return `{ ...result, agentHarnessId: harness.id }`.
  2. If defined → call `harness.classify(resultWithoutPrevious, params)` and merge the classification.
- Tests: unit test `classify` is called; `agentHarnessId` is always stamped.

### Priority 2 — Harness-aware compaction (complete the contract)

**P2-A: Expose `maybeCompactAgentHarnessSession` from `selection.ts`**

- Mirrors OpenClaw's export exactly.
- If the selected harness has no `compact()` and the harness id is not `pi`, return `{ ok: false, compacted: false, reason: '...' }`.
- If `pi`, return `undefined` (defer to built-in compaction).
- Wire into `src/main/agent/compaction.ts` where the compaction entry point is.

### Priority 3 — Diagnostic events (observability)

**P3-A: Structured run lifecycle events in `v2.ts`**

- Add `emitHarnessRunStarted`, `emitHarnessRunCompleted`, `emitHarnessRunError` helpers.
- Emit at the same lifecycle phases as OpenClaw.
- Use Friday's existing logger/event bus (or a lightweight in-process event emitter).
- Do not block execution; emit is fire-and-forget.

### Priority 4 — Plugin activation at harness selection (correctness for plugin harnesses)

**P4-A: Wire plugin loading before harness dispatch**

- File: `src/main/agent/harness/runtime-plugin.ts` (new)
- Implement `ensureSelectedHarnessPlugin(params)`: if `policy.runtime !== 'auto' && runtime !== 'pi'`, ensure the plugin providing that harness is loaded before `selectAgentHarness` returns.
- Call in `runAgentHarnessAttempt` before selection, after policy resolution.
- Use the existing `onAgentHarnesses` activation path.

### Priority 5 — Config runtime collector (startup pre-loading)

**P5-A: `harness-runtimes.ts`**

- Implement `collectConfiguredAgentHarnessRuntimes(config, env)`.
- Read runtimes from: env var `FRIDAY_AGENT_RUNTIME`, provider configs, model configs, agent configs.
- Called at app startup to pre-load plugin runtimes referenced in config.

### Priority 6 — Plugin hook infrastructure (extensibility, not blocking)

**P6-A: `harness/hook-context.ts`**

- Add `AgentHarnessHookContext` type and `buildAgentHookContext` factory.
- Subset of run params, no plugin dependencies.

**P6-B: `harness/lifecycle-hook-helpers.ts`**

- Port `runAgentHarnessLlmInputHook`, `runAgentHarnessLlmOutputHook`, `runAgentHarnessAgentEndHook`.
- Port `runAgentHarnessBeforeAgentFinalizeHook` with the retry budget (SHA-256 idempotency key, 2048 cap, per-runId map).
- Wire to Friday's plugin hook runner (requires the hook runner surface to exist first).

**P6-C: `harness/prompt-compaction-hook-helpers.ts`**

- Port `resolveAgentHarnessBeforePromptBuildResult` and `before/after_compaction` hooks.
- Wire into `src/main/agent/before-agent-run.ts` and `compaction.ts`.

**P6-D: `harness/hook-helpers.ts`**

- Port `runAgentHarnessAfterToolCallHook` and `runAgentHarnessBeforeMessageWriteHook`.
- Wire into tool execution path.

### Priority 7 — Tool result middleware (plugin extensibility)

**P7-A: `harness/tool-result-middleware.ts`**

- Port the middleware runner and content/size validators.
- Add `AgentToolResultMiddleware` type to the plugin API surface.
- Load registered middlewares for the active runtime before each tool result is returned.

### Priority 8 — Minor type parity

**P8-A: Add `deliveryDefaults` to `AgentHarness` in `types.ts`**

- Low priority. Add the optional field; no behavior change until a consumer reads it.

---

## 4. Recommended rollout order

```
P1-A (import bug)         — minutes, zero risk
P1-B (classify + stamp)   — 1–2 hours, adds correctness
P2-A (compaction routing) — 1 day, wires existing interface
P3-A (diagnostics)        — 1 day, observability only
P4-A (plugin activation)  — 1–2 days, depends on existing activation planner
P5-A (runtime collector)  — half day
P6-* (hooks)              — gated on plugin hook runner surface
P7-A (middleware)         — gated on P6 hook infrastructure
P8-A (deliveryDefaults)   — minutes when convenient
```

---

## 5. Tests to add alongside implementation

| Area              | Test                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| `v2.ts classify`  | `classify()` called when present; result has `agentHarnessId` always           |
| `v2.ts classify`  | `classify()` not called if undefined; result still has `agentHarnessId`        |
| `selection.ts`    | `maybeCompactAgentHarnessSession` routes to `compact()` when present           |
| `selection.ts`    | Returns `{ ok: false }` when plugin harness has no `compact()`                 |
| `selection.ts`    | Returns `undefined` for `pi` harness (defer to built-in)                       |
| `registry.ts`     | `resetRegisteredAgentHarnesses` propagates to harnesses with `reset()` defined |
| `registry.ts`     | Reset errors per-harness are isolated (one failure doesn't skip others)        |
| Plugin activation | Non-`auto` runtime triggers activation before selection                        |
