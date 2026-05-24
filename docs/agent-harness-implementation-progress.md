# Friday Agent Harness Implementation Progress

This page tracks the current implementation status. The original rollout plan and OpenClaw scrape are historical references; use this page plus `docs/features/plugins-and-agent-harnesses.md` for the current source-backed summary.

## Implemented against OpenClaw reference

### 1) Harness contract and registry (`src/main/agent/harness`)

- Added `types.ts` with `AgentHarness` and related request/result types.
- Added `registry.ts` for global runtime registration with id validation and duplicate protection.
- Added optional lifecycle hooks (`reset`, `dispose`) to match plugin-owned runtimes.
- Added optional `runSideQuestion`, `classify`, `compact`, and `deliveryDefaults` contract fields.
- Added builtin fallback harness in `builtin-pi.ts`.

### 2) Policy, selection, and dispatch

- Added `policy.ts` with runtime resolution precedence:
  - explicit request runtime (`agentRuntime` / `agentHarnessId`),
  - stored preference,
  - default `auto`.
- Added `selection.ts` with:
  - forced `pi` and forced plugin runtime,
  - auto-mode plugin candidate probing via `supports(...)`,
  - priority + id tiebreak,
  - fallback to builtin `pi` if no plugin supports.
- Added lifecycle adapter/runner in `v2.ts` with cleanup/error semantics.
- Result resolution now stamps `agentHarnessId` and applies optional `classify(...)` output.
- Harness run selection and lifecycle decisions are logged through `agentLogger`.

### 3) Service and store integration

- `src/main/service.ts` now uses `runAgentHarnessAttempt`.
- Added harness request fields to send options (`agentRuntime`, `agentHarnessId`).
- Added IPC/public API wiring so harness overrides can be passed into `agent.send`:
  - `src/shared/ipc-channels/index.ts` send args now accept optional runtime override options.
  - `src/preload/index.ts` and `src/preload/index.d.ts` now expose `agent.send(message, options)`.
  - `src/main/ipc/agent-ipc.ts` forwards runtime overrides into `AgentService.send`.
- Added runtime preference accessors in `src/main/store/service.ts`:
  - `getAgentRuntimePreference()`
  - `setAgentRuntimePreference(...)`
- Preference parsing is normalized from model module options.

### 4) Plugin registration surface

- `src/main/plugins/api-builder.ts` now:
  - accepts typed `registerAgentHarness(AgentHarness)`
  - writes the registration both to plugin registry and global harness registry.
- Registry import guardrails in `registerAgentHarness` verify required methods.

### 5) Runtime lifecycle integration

- `src/main/service.ts` reset path now invokes harness reset hooks.
- `src/main/bootstrap.ts` shutdown path now invokes harness dispose hooks.

### 6) Runtime activation and configured runtime discovery

- `src/main/agent/harness/activation.ts` registers a shared runtime activator and manifest loader.
- `src/main/agent/harness/runtime-plugin.ts` discovers plugin manifests, resolves an `agentHarness` activation plan, and loads matching runtime entries.
- `src/main/bootstrap.ts` registers runtime plugin activation and eagerly activates configured non-default runtimes.
- `src/main/agent/harness-runtimes.ts` collects configured runtime ids from `FRIDAY_AGENT_RUNTIME` and nested `agentRuntime`, `agentHarnessId`, or `agentHarnessRuntime` config keys.
- `runAgentHarnessAttempt(...)` and `maybeCompactAgentHarnessSession(...)` activate resolved non-`pi` runtimes before selection.

### 7) Compaction, hook helpers, and tool-result middleware

- `src/main/agent/compaction.ts` fires `before_compaction` and `after_compaction` harness hooks.
- When a requested or stored runtime is present, compaction delegates to `compact(...)` on the selected harness before falling back to native summarization.
- `hook-context.ts`, `hook-runner.ts`, `lifecycle-hook-helpers.ts`, `prompt-compaction-hook-helpers.ts`, and `hook-helpers.ts` define the harness hook payloads and dispatch surface.
- `tool-result-middleware.ts` defines bounded tool-result middleware registration and validation helpers.

## Current status vs full OpenClaw parity

- Core selector + built-in fallback + plugin selection + lifecycle hooks are in place.
- Forced runtime plugin activation is wired at bootstrap, harness attempts, and harness-aware compaction.
- Result classification and harness id stamping are implemented in the lifecycle adapter.
- Harness-aware compaction is implemented for requested or stored runtimes.
- Compaction hooks are wired; other hook helper surfaces exist but are not all connected to the main run loop yet.
- Diagnostics currently use Friday logging rather than OpenClaw-style structured `harness.run.*` diagnostic events.
- Tool-result middleware helpers exist, but the main tool execution path still needs an integration point before plugin middleware can transform every result.
