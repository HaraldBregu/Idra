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

Expose a single factory function that accepts a config and returns an AgentHarness instance.

The config is fully optional. The harness must work with zero configuration using defaults persisted in the store.

When config is provided, it overrides the corresponding store defaults for that session. Supported input config fields include: modelId, providerId, effort, maxTokens, temperature, systemPrompt, enabledTools, enabledSkills, and safetyRules. Any field not provided falls back to the value in the store.

This allows any UI or host to drive the harness in three ways:
- No config: the harness runs with whatever is in agent.json.
- Partial config: the caller overrides only what it cares about (e.g. modelId only).
- Full config: the caller supplies everything and bypasses stored defaults entirely.

AgentHarness exposes: run, session, memory, tools, hooks, skills, store, and abort.

The run method accepts a task string and options, and returns an async iterable of typed agent events.

All modules access shared state through the AgentStore. No module initializes its own store.

The harness is UI-agnostic by design. It has no dependency on any rendering framework, window system, or UI toolkit. A CLI, a desktop app, a web app, a REST endpoint, or a background automation can all drive it identically by calling run and subscribing to events.

============================================================
4. PERSISTENCE: ELECTRON STORE + AGENT.JSON
============================================================

The agent uses electron-store as its sole persistence mechanism. All agent state, settings, memory, tools, MCP configuration, sessions, skills, and logs are stored in a single file: agent.json.

Rules:
- Use the electron-store package. Do not use any other storage library, database, or external service.
- Instantiate one Store instance in src/agent/store.ts and export it as a singleton.
- Every module (memory, sessions, tools, skills, hooks, logs, undo, safety) reads and writes through this shared store instance.
- No module creates its own store. No module writes to disk independently.
- No network calls, no cloud sync, no external API for persistence.

The store schema holds: settings, sessions, memory, tools, skills, mcp, hooks, logs, and snapshots.

Initialize the store with typed defaults for all schema keys.

Each module reads from and writes to its own schema key via the shared store singleton.

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

No module owns its own config. Each module reads its slice from the settings key in the store.

MCP configuration lives in the mcp key of the store. Modules that need MCP servers read from there. No module hardcodes server URLs or command paths.

============================================================
5a. MCP PROVIDER REGISTRY
============================================================

Every MCP provider is registered dynamically at runtime. No provider name, server URL, command path, transport type, or capability is hardcoded anywhere in the system.

A provider entry in the store describes everything the loader needs to connect: an id, a display name, a transport (stdio or SSE), the command or URL, and any arguments or headers. The loader reads these entries from the store and connects to each provider at harness initialization.

Providers can be added, updated, or removed at runtime by writing to the mcp key in the store. The harness reloads the provider list on each new run. No restart is required.

When a provider connects, it exposes its tools and capabilities dynamically. The loader introspects the provider and registers its tools into the unified tool registry. The harness has no prior knowledge of what tools any provider will expose.

Rules:
- No provider ID, name, URL, or command appears as a constant or literal in source code.
- No provider is assumed to exist. The system degrades gracefully if a registered provider is unavailable.
- A provider that fails to connect emits a provider_error event and is skipped. Its tools are not registered.
- The same provider can be registered multiple times with different IDs and configs (e.g. two different MCP server instances).
- Tool IDs from MCP providers are namespaced by provider ID to avoid collisions with built-in tools.

============================================================
6. AGENT RUNTIME / HARNESS LAYER
============================================================

The harness orchestrates the agent loop:

1. Load context (memory, tools, skills, hooks) from the store.
2. Construct system prompt from settings and memory.
3. Call the model with tools attached.
4. Parse the model response.
5. If tool call: validate, check safety, request human approval if required, execute, record result in log.
6. If final answer: emit result event, persist session to store.
7. If abort signal received: stop loop, persist partial state.

The harness emits typed events via an EventEmitter for every state transition.

============================================================
7. TOOL SYSTEM LAYER
============================================================

All tools are registered in the shared store under the tools key.

Each tool has an id, name, description, JSON schema, and an execute function.

The tool registry reads enabled tool IDs from settings. Only enabled tools are passed to the model.

MCP tools are loaded from the mcp key of the store at harness initialization. They are registered into the same tool registry as built-in tools. There is one unified tool registry.

============================================================
8. MEMORY LAYER
============================================================

Memory is a list of typed entries stored in the memory key of the store.

Each memory entry has an id, type (fact, task, session, or skill), content, createdAt timestamp, and tags.

Memory is retrieved by relevance before each run and injected into the system prompt.

============================================================
9. SESSION LAYER
============================================================

Sessions are stored in the sessions key of the store, keyed by session ID.

Each session holds message history, active tool results, undo snapshots for that session, and a status (active, completed, or aborted).

============================================================
10. SAFETY LAYER
============================================================

Safety rules are stored in settings. Before any tool executes:

1. Check input against safety rules.
2. If a rule is triggered: block execution, emit a safety event, log to the store.

Safety rules are configurable at runtime via the store. No hardcoded rules in code.

============================================================
11. HUMAN-IN-THE-LOOP LAYER
============================================================

Approval checkpoints are defined per tool in the tool registry.

When a tool requires approval:
1. Emit an approval_required event with the tool name and input.
2. Suspend the agent loop.
3. Wait for approve or reject to be called on the harness.
4. Resume or abort.

The UI or host process subscribes to events and calls the approval methods. The harness is UI-agnostic.

============================================================
12. UNDO / SNAPSHOT LAYER
============================================================

Before any irreversible tool execution, the harness captures a snapshot of the relevant store slice and appends it to the snapshots key.

Undo restores the most recent snapshot for the current session.

============================================================
13. HOOKS / MIDDLEWARE LAYER
============================================================

Hooks are stored in the hooks key of the store and loaded at harness initialization.

Each hook has an id, a trigger (before_tool, after_tool, before_run, or after_run), and a handler reference.

Hooks are executed in order at their trigger point. Hook handlers are TypeScript functions loaded from the skills registry.

============================================================
14. SKILLS LAYER
============================================================

Skills are dynamic capabilities loaded on demand.

Skills follow the structure and rules defined in docs/prompts/main/skills.md. That document is the authoritative specification for skill format, folder structure, SKILL.md schema, validation rules, error handling, progressive loading behavior, and testing requirements. Implement the skills layer in full conformance with it.

Key points from that spec that apply here:
- A skill is a folder. A folder is only treated as a skill if it contains a SKILL.md file.
- SKILL.md contains YAML frontmatter (name, description, and optional fields) followed by Markdown instructions.
- Skill metadata is loaded at discovery time. Full instructions are loaded only when a skill is activated.
- Supporting files in scripts/, references/, and assets/ are read only when the activated instructions reference them.
- Skill names must match their parent folder name and follow the naming rules defined in the spec.
- Invalid or partial skill folders are skipped without breaking unrelated skills.

Skills are stored in the skills key of the store. Each entry holds the skill name, description, and resolved install path. The full SKILL.md content is not stored in the store; it is read from disk when the skill is activated.

Skills are loaded at runtime from the store. No skill is hardcoded into the harness.

============================================================
15. EVENT AND OBSERVABILITY LAYER
============================================================

The harness emits typed events covering: thinking, tool_call, tool_result, approval_required, safety_blocked, answer, error, and aborted.

All events are also appended to the logs key of the store for observability.

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

Write tests for every module. Tests live alongside source files as module.test.ts.

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
18. DESIGN PATTERNS AND SOFTWARE STANDARDS
============================================================

Apply the best design patterns appropriate to each layer. Do not apply patterns mechanically — use them only where they reduce complexity and improve clarity.

Creational patterns:
- Use Factory (createAgentHarness) as the single entry point. Callers never instantiate internals directly.
- Use Singleton for the store. One instance, shared across all modules.

Structural patterns:
- Use Facade for the AgentHarness public API. It hides harness internals from the caller.
- Use Registry for tools, skills, and hooks. Each registry manages its own collection behind a consistent interface.
- Use Adapter when wrapping MCP tools into the internal tool interface.
- Use Decorator for the executor layer: safety check, approval gate, and logging wrap the core tool call without modifying the tool itself.

Behavioral patterns:
- Use Strategy for context building, memory retrieval, and safety evaluation. Each is an interchangeable function with a defined contract.
- Use Observer (EventEmitter) for agent events. The harness emits; consumers subscribe without being coupled to the harness.
- Use Command for undo snapshots. Each reversible operation captures its inverse before executing.
- Use Chain of Responsibility for the hook system. Hooks run in sequence; each can short-circuit the chain.
- Use Iterator for the run method. The agent loop is an async iterable of events.

Software standards:
- Follow SOLID principles. Each module has one responsibility, depends on abstractions, and is open to extension without modification.
- Follow DRY. Extract shared logic once. If the same pattern appears in three places, it belongs in a shared utility.
- Follow the principle of least privilege. No module accesses more of the store than it needs.
- Type everything explicitly. No any, no unknown without a guard, no implicit return types on public functions.
- Prefer pure functions. Side effects (store writes, event emissions) happen at the boundary, not inside domain logic.
- Keep functions small. If a function cannot be understood in one screen, split it.

============================================================
19. IMPLEMENTATION RULES
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
- Types in types.ts only.
- No barrel files unless explicitly required for public API surface.
