# Agent V2

`agent_v2` is a dependency-free architecture reference for an AI agent harness. It is not wired into the current runtime.

## Success Criteria

1. Define the harness as `Agent = Model + Harness`.
2. Preserve the four-layer model: stateless LLM core, runtime, capabilities, safety and scale.
3. Represent the central ReAct-style loop and its supporting subsystems.
4. Classify controls with the guides/sensors and computational/inferential matrix.
5. Keep this folder free of imports outside `src/main/agent_v2`.

## Layers

### Core

The stateless model receives tokens and returns text. It has no durable state, tool access, environment access, or real-time knowledge without the harness.

### Runtime

Runtime owns the execution loop and immediate services:

- Prompt composition
- Output parsing
- Error recovery
- Model routing
- Loop bookkeeping

The loop follows `Perceive -> Reason -> Act -> Observe` and can be implemented as ReAct, plan-and-execute, ReWOO, or evaluator-optimizer variants.

### Capabilities

Capabilities give the runtime useful surfaces to call:

- Tool registry and tool definitions
- MCP-style tool/resource/prompt boundaries
- Skills loaded by progressive disclosure
- Context engineering, compaction, and working memory
- Session persistence

### Safety And Scale

Safety and scale are independent backstops around the loop:

- Prompt guardrails
- Schema restrictions
- Runtime approvals
- Tool validation
- Lifecycle hooks
- Sandboxed execution
- Verification loops
- Subagent orchestration
- Observability traces

## Control Matrix

Every harness component can be labeled by two axes:

- `guide`: feedforward control that shapes the next model step.
- `sensor`: feedback control that evaluates model output, tool results, or runtime behavior.
- `computational`: deterministic control, such as tests or schema validation.
- `inferential`: LLM-based or semantic control, such as review agents or LLM-as-judge.

## Files

- `types.ts`: shared dependency-free type definitions.
- `layers.ts`: the four concentric harness layers.
- `loop.ts`: the extended ReAct loop phases.
- `controls.ts`: the guide/sensor taxonomy.
- `safety.ts`: defense-in-depth safety stack.
- `reference.ts`: composed diagram-ready architecture object.
- `index.ts`: public exports for this folder.
