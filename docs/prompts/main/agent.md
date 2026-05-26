You are a senior TypeScript coding agent.

Build a UI-independent TypeScript agent harness architecture.

The goal is to create a reusable agent runtime that can be embedded into any interface, workflow, application, backend, automation system, or product surface.

The architecture follows this principle:

Agent = Model + Harness

The model provides reasoning.
The harness provides execution, tools, state, memory, context management, orchestration, safety, persistence, human-in-the-loop control, and observability.

Build the system as an explicit, modular architecture.

============================================================
1. ARCHITECTURAL OBJECTIVE
============================================================

Create a TypeScript agent harness that supports:

1. Programmatic task execution.
2. Persistent sessions.
3. Multi-turn state.
4. Tool-using agent execution.
5. Extended ReAct-style reasoning.
6. Planning before execution.
7. Human approval checkpoints.
8. Subagents with isolated context.
9. Context engineering.
10. Durable memory.
11. Safety enforcement.
12. Tool result optimization.
13. Runtime hooks.
14. Event emission.
15. External tool discovery.
16. Skills loaded on demand.
17. Operation logs.
18. Undo snapshots.
19. Abort/cancellation support.
20. Embedding into any future UI.

The harness should be designed as a runtime core, not as a specific application surface.

============================================================
2. CORE ARCHITECTURE
============================================================

Organize the system into these layers:

1. Public API Layer
2. Agent Scaffolding Layer
3. Agent Runtime / Harness Layer
4. Model Role Layer
5. Tool System Layer
6. Context Engineering Layer
7. Memory Layer
8. Human-in-the-Loop Layer
9. Safety Layer
10. Subagent Orchestration Layer
11. Persistence Layer
12. Hooks / Middleware Layer
13. External Tools and Skills Layer
14. Event and Observability Layer

Each layer should have clear boundaries, typed interfaces, and explicit dependencies.

============================================================
3. PUBLIC API LAYER
============================================================

Expose a single factory:

```ts
createAgentHarness(config: AgentHarnessConfig): Promise<AgentHarness>