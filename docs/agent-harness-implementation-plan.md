# Friday Agent Harness Implementation Plan (based on OpenClaw reference)

## Goal
Implement a plugin-selectable agent execution harness layer in Friday’s `src/main` using OpenClaw’s `AgentHarness` architecture as a template.

## What currently exists in Friday
- Plugin API surface already accepts `registerAgentHarness`, stored as generic registry values under the `agentHarnesses` surface (`src/main/plugins/api-builder.ts`, `src/main/plugins/registry.ts`).
- There is a manifest hook `onAgentHarnesses` and activation trigger type (`src/main/plugins/manifest.ts`, `src/main/plugins/activation-planner.ts`).
- The actual run loop is still provider-native and does not dispatch through a harness abstraction (`src/main/agent/run.ts`).

## OpenClaw model to mirror
- `AgentHarness` contract (required + optional methods): `openclaw/src/agents/harness/types.ts`
- Harness registration + duplicate-safe global registry: `openclaw/src/agents/harness/registry.ts`
- Runtime policy (auto/forced selection semantics): `openclaw/src/agents/harness/selection.ts` + `openclaw/src/agents/harness/policy.ts`
- Lifecycle adapter with diagnostics/error handling: `openclaw/src/agents/harness/v2.ts`
- Built-in fallback harness path (`pi`): `openclaw/src/agents/harness/builtin-pi.ts`
- Plugin runtime registration validation at plugin load: `openclaw/src/plugins/registry.ts`

## Proposed Friday implementation plan

### Phase 1 — Contract and registration typing
1. Add `src/main/agent/harness/types.ts`
- Define required shape equivalent to OpenClaw:
  - `id`, `label`, `supports(ctx)`, `runAttempt(params)`
  - optional: `runSideQuestion`, `classify`, `compact`, `reset`, `dispose`
- Define shared attempt/result/context types aligned with Friday provider stream model.

2. Add `src/main/agent/harness/builtin-pi.ts`
- Implement built-in harness with `id: 'pi'`.
- `supports` always returns supported.
- `runAttempt` delegates to existing Friday run behavior (provider-stream path).

3. Add `src/main/agent/harness/registry.ts`
- Global registry with register/list/get/clear/reset/dispose helpers.
- Persist plugin ownership metadata in registry entries.
- Enforce duplicate-id validation on registration.

4. Tighten plugin registration typing in `src/main/plugins/api-builder.ts`.
- Import/ expose `registerAgentHarness` as typed method.
- Ensure invalid registrations don’t silently slip through as `unknown` values.

5. Add harness registration validation in plugin entry validation stage.
- Add a harness-specific validation function similar to OpenClaw’s runtime checks:
  - non-empty `id`
  - required `supports` and `runAttempt` are functions
- Keep behavior for duplicate ID conflicts explicit and diagnosable.

### Phase 2 — Selection policy + runtime resolver
6. Add `src/main/agent/harness/policy.ts`
- Implement `resolveAgentHarnessPolicy` for Friday context.
- Suggested policy sources (in order):
  - explicit run override (`agentHarnessId` / `runtime` in send options)
  - stored agent model module option (`llmAgent.options.agentRuntime` in store)
  - default `'auto'`

7. Add `src/main/agent/harness/selection.ts`
- Implement:
  - `selectAgentHarness(params)`
  - candidate list based on `supports({ provider, modelId, requestedRuntime })`
  - auto mode: choose highest priority, tie-break by `id`
  - fallback to `pi` when no plugin harness supports
  - forced non-auto harness that is missing => throw explicit error
- Implement `runAgentHarnessAttempt(params)` to invoke selected harness through lifecycle path.

8. Add `src/main/agent/harness/v2.ts` (or equivalent lifecycle wrapper)
- Wrap harness calls with:
  - `prepare -> start -> send -> resolveOutcome -> cleanup`
  - consistent event/error behavior and cleanup guarantees
- Map Friday errors/results cleanly through this wrapper.

### Phase 3 — Run-path integration
9. Refactor `src/main/agent/run.ts` execution entry to be a harness candidate.
- Keep current loop intact as the built-in `pi` implementation (or move to helper used by built-in harness).
- Add a new `runAgentHarnessAttempt` path that runs selected harness; default flow remains functionally unchanged.

10. Integrate in `src/main/service.ts`
- Resolve operator/provider/model as today.
- Resolve harness policy and select harness before execution.
- Replace direct `runAgent(...)` call with `runAgentHarnessAttempt(...)`.
- Preserve `hooks`, tool selection, stream events, session persistence, and logging behavior.

### Phase 4 — Store/config plumbing for runtime preference
11. Add optional harness override fields in model-module options (`src/main/store/types.ts`, `src/main/store/service.ts`).
- Reuse `llmAgent.options` without breaking existing payloads.
- Add read/write helpers for persisted/default harness selection.

12. Extend send options type (`src/main/service.ts`) with optional `agentRuntime`/`agentHarnessId` if runtime override is part of public behavior.
- Default remains backward-compatible.

### Phase 5 — Activation and plugin loading integration
13. Use existing `onAgentHarnesses` contract in Friday to trigger plugin activation when non-auto runtime is selected.
- If Friday uses lazy plugin loading, ensure selected plugin runtime is loaded before harness dispatch.
- If loading is eager today, keep this as a no-op with a compatibility guard and telemetry.

### Phase 6 — Lifecycle hooks and housekeeping
14. Add optional reset/dispose execution points.
- On session reset/agent reset, invoke `reset` on registered harnesses with safe per-harness isolation.
- On app shutdown/reload path, invoke `dispose` for registered harnesses.

15. Add diagnostics/tuning
- Add debug logging for:
  - selected harness
  - decision reason (`forced/pi/auto + chosen candidate`)
  - support reason rejections (optional)
- Preserve existing error format; no behavior changes for user-visible stream if harness fails before tool execution.

## Rollout order (minimum viable)
1. Contract + builtin pi harness + registry + selection + run dispatch.
2. Add policy/source options.
3. Add optional store/runtime overrides.
4. Add lifecycle hooks and cleanup.
5. Add tests.

## Suggested tests (before implementation)
- `src/main/agent/harness/selection` behavior:
  - auto picks highest priority support
  - tie-break by id
  - forced harness fallback + missing id error
  - auto falls back to `pi`
- plugin API registration validation:
  - rejects missing required methods
  - duplicates rejected with plugin attribution
- service integration:
  - `AgentService.send` still succeeds with default `pi`
  - forced harness selection routes through explicit harness
  - existing stream/session behavior unchanged for default path

## Open questions before coding
- Does Friday ever lazy-load plugin runtime entries in production startup? If yes, explicit harness selection must trigger loading.
- Do we want `runSideQuestion`/`classify`/`compact` surfaced in Friday now or left as future extension?
- Do we require per-harness plugin activation/cleanup APIs beyond existing generic `cleanup` surface?
