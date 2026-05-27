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
```

`AgentHarness` exposes:

```ts
interface AgentHarness {
  run(task: string, options?: RunOptions): AsyncIterable<AgentEvent>
  session: SessionManager
  memory: MemoryManager
  tools: ToolRegistry
  hooks: HookRegistry
  skills: SkillRegistry
  store: AgentStore
  abort(): void
}
```

All modules access shared state through `AgentStore`. No module initializes its own store.

============================================================
4. PERSISTENCE: ELECTRON STORE + AGENT.JSON
============================================================

The agent uses electron-store as its sole persistence mechanism. All agent state, settings, memory, tools, MCP configuration, sessions, skills, and logs are stored in a single file: agent.json.

Rules:
- Use the `electron-store` package. Do not use any other storage library, database, or external service.
- Instantiate one `Store` instance in `src/agent/store.ts` and export it as a singleton.
- Every module (memory, sessions, tools, skills, hooks, logs, undo, safety) reads and writes through this shared store instance.
- No module creates its own store. No module writes to disk independently.
- No network calls, no cloud sync, no external API for persistence.

Store schema (agent.json):

```ts
interface AgentSchema {
  settings: AgentSettings
  sessions: Record<string, Session>
  memory: MemoryEntry[]
  tools: ToolEntry[]
  skills: SkillEntry[]
  mcp: McpConfig
  hooks: HookEntry[]
  logs: LogEntry[]
  snapshots: Snapshot[]
}
```

Initialize with typed defaults:

```ts
const store = new Store<AgentSchema>({
  name: 'agent',
  defaults: { ... }
})
```

Access pattern in each module:

```ts
import { store } from '../store'

store.get('memory')
store.set('memory', updated)
```

============================================================
5. SHARED CONFIGURATION
============================================================

All modules share one settings object persisted in the store.

Settings include:
- Model name, temperature, max tokens.
- MCP server definitions (stdio or SSE transports).
- Enabled tool IDs.
- Loaded skill IDs.
- Safety rules.
- Hook definitions.
- Log retention policy.

No module owns its own config. Each module reads its slice from `store.get('settings')`.

MCP configuration lives at `store.get('mcp')`. Modules that need MCP servers read from there. No module hardcodes server URLs or command paths.

============================================================
6. AGENT RUNTIME / HARNESS LAYER
============================================================

The harness orchestrates the agent loop:

1. Load context (memory, tools, skills, hooks) from the store.
2. Construct system prompt from settings + memory.
3. Call the model with tools attached.
4. Parse the model response.
5. If tool call: validate, check safety, request human approval if required, execute, record result in log.
6. If final answer: emit result event, persist session to store.
7. If abort signal received: stop loop, persist partial state.

The harness emits typed events via an EventEmitter for every state transition.

============================================================
7. TOOL SYSTEM LAYER
============================================================

All tools are registered in the shared store under `store.get('tools')`.

Tool interface:

```ts
interface Tool {
  id: string
  name: string
  description: string
  schema: JSONSchema
  execute(input: unknown): Promise<ToolResult>
}
```

Tool registry reads enabled tool IDs from `store.get('settings').enabledTools`. Only enabled tools are passed to the model.

MCP tools are loaded from `store.get('mcp')` at harness initialization. They are registered into the same tool registry as built-in tools.

============================================================
8. MEMORY LAYER
============================================================

Memory is a list of typed entries stored at `store.get('memory')`.

Memory entry:

```ts
interface MemoryEntry {
  id: string
  type: 'fact' | 'task' | 'session' | 'skill'
  content: string
  createdAt: number
  tags: string[]
}
```

Memory is retrieved by relevance before each run and injected into the system prompt.

============================================================
9. SESSION LAYER
============================================================

Sessions are stored at `store.get('sessions')` keyed by session ID.

Each session holds:
- Message history.
- Active tool results.
- Undo snapshots for that session.
- Status (active, completed, aborted).

============================================================
10. SAFETY LAYER
============================================================

Safety rules are stored in `store.get('settings').safetyRules`.

Before any tool executes:
1. Check input against safety rules.
2. If rule triggered: block execution, emit safety event, log to store.

Safety rules are configurable at runtime via the store. No hardcoded rules in code.

============================================================
11. HUMAN-IN-THE-LOOP LAYER
============================================================

Approval checkpoints are defined per tool in the tool registry.

When a tool requires approval:
1. Emit an `approval_required` event with the tool name and input.
2. Suspend the agent loop.
3. Wait for `approve()` or `reject()` to be called on the harness.
4. Resume or abort.

The UI or host process subscribes to events and calls the approval methods. The harness is UI-agnostic.

============================================================
12. UNDO / SNAPSHOT LAYER
============================================================

Before any irreversible tool execution, the harness captures a snapshot of the relevant store slice and appends it to `store.get('snapshots')`.

Undo restores the most recent snapshot for the current session.

============================================================
13. HOOKS / MIDDLEWARE LAYER
============================================================

Hooks are stored in `store.get('hooks')` and loaded at harness initialization.

Hook interface:

```ts
interface Hook {
  id: string
  trigger: 'before_tool' | 'after_tool' | 'before_run' | 'after_run'
  handler: string
}
```

Hooks are executed in order at their trigger point. Hook handlers are TypeScript functions loaded from the skills registry.

============================================================
14. SKILLS LAYER
============================================================

Skills are dynamic capabilities loaded on demand.

Skills are stored in `store.get('skills')`. Each skill has a name, description, and an execute function path.

Skills are loaded at runtime from the store. No skill is hardcoded into the harness.

============================================================
15. EVENT AND OBSERVABILITY LAYER
============================================================

The harness emits typed events:

```ts
type AgentEvent =
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'approval_required'; tool: string; input: unknown }
  | { type: 'safety_blocked'; tool: string; rule: string }
  | { type: 'answer'; content: string }
  | { type: 'error'; message: string }
  | { type: 'aborted' }
```

All events are also appended to `store.get('logs')` for observability.

============================================================
16. FILE STRUCTURE
============================================================

```
src/agent/
  store.ts          -- singleton Store instance
  harness.ts        -- agent loop orchestrator
  types.ts          -- all shared TypeScript types
  api.ts            -- createAgentHarness factory

  memory/
    manager.ts      -- read/write memory entries

  sessions/
    manager.ts      -- read/write sessions

  tools/
    registry.ts     -- load and manage tools
    executor.ts     -- execute a tool with safety + approval

  skills/
    registry.ts     -- load skills from store

  hooks/
    registry.ts     -- load and run hooks

  safety/
    check.ts        -- evaluate safety rules

  context/
    build.ts        -- assemble system prompt from store state

  mcp/
    loader.ts       -- load MCP servers from store config

  events/
    emitter.ts      -- typed event emitter

  snapshots/
    capture.ts      -- capture and restore store snapshots

  log/
    append.ts       -- append log entries to store
```

One exported function or class per file. Filenames are a single word.

============================================================
17. TESTING
============================================================

Write tests for every module. Tests live alongside source files:

```
src/agent/memory/manager.test.ts
src/agent/tools/registry.test.ts
src/agent/tools/executor.test.ts
src/agent/safety/check.test.ts
src/agent/sessions/manager.test.ts
src/agent/context/build.test.ts
src/agent/snapshots/capture.test.ts
src/agent/hooks/registry.test.ts
src/agent/harness.test.ts
```

Test requirements:
- Use a fresh in-memory store instance for each test. Do not share store state between tests.
- Test each module in isolation. Pass the store as a dependency if needed.
- Test the harness loop end-to-end with a mocked model and mocked tools.
- Test safety rule evaluation with inputs that should be blocked and inputs that should pass.
- Test approval flow: emit event, call approve, confirm tool executes; call reject, confirm tool is skipped.
- Test undo: execute a tool, snapshot captured, undo restores prior state.
- Test abort: send abort signal mid-loop, confirm state is persisted, confirm aborted event emitted.

Validation criteria — the implementation is complete when:
- All tests pass.
- The harness can run a multi-turn task using only the store for state.
- No module accesses any storage outside the shared store.
- No external network calls are made during a test run.
- TypeScript compiles with no errors.

============================================================
18. IMPLEMENTATION RULES
============================================================

Refactor, do not migrate.
- Rewrite modules to fit this architecture. Do not add compatibility shims or migration layers.
- Remove any file that is no longer referenced after refactoring.
- Do not leave dead exports, unused imports, or commented-out code.

No comments.
- Write no inline comments and no docstrings.
- Name things clearly enough that comments are unnecessary.

No external dependencies for persistence.
- electron-store is the only allowed storage mechanism.
- No SQLite, no filesystem writes outside electron-store, no cloud APIs.

Readable structure.
- One exported function or class per file.
- Single-word filenames.
- Types in `types.ts` only.
- No barrel files unless explicitly required for public API surface.
