# Friday Agent Harness Implementation Progress

## Implemented against OpenClaw reference

### 1) Harness contract and registry (`src/main/agent/harness`)
- Added `types.ts` with `AgentHarness` and related request/result types.
- Added `registry.ts` for global runtime registration with id validation and duplicate protection.
- Added optional lifecycle hooks (`reset`, `dispose`) to match plugin-owned runtimes.
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

## Current status vs full OpenClaw parity
- Core selector + built-in fallback + plugin selection + lifecycle hooks are in place.
- Plugin activation planning hooks are now wired at harness dispatch: `src/main/agent/harness/selection.ts` calls
  `ensureAgentHarnessRuntimeActivated(...)` before harness selection. Harness runtime activation now registers a
  manifest loader and activator in `src/main/agent/harness/runtime-plugin.ts`; this discovery-backed activator loads
  connector manifests and executes matching runtime entries for non-`auto`/non-`pi` harnesses.
- Advanced OpenClaw-only capabilities (diagnostics/events, result-classification and compaction adapters, activation planning integration) are not yet fully ported.
