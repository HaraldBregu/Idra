# Agent Harness Architecture

## Component Map

- Public API: `createAgentHarness`, `ExecutableAgentHarness`, event streaming, session APIs.
- Runtime: `DefaultAgentHarness` owns reason-act-observe turns, cancellation, budgets, retries, tool routing, and state persistence.
- Provider layer: `AgentHarnessModel` is the provider adapter port; `StaticAgentHarnessModelRegistry` stores capabilities, context windows, streaming/tool support, and cost metadata.
- Tools: `DefaultAgentHarnessToolRegistry` plus external providers normalize native, connector, skill, and MCP tools into one `AgentHarnessTool` shape.
- MCP: `McpAgentHarnessToolProvider` uses the official MCP SDK client/transports and namespaces server tools as `server__tool`.
- Connectors: `AgentHarnessConnector` and registry keep auth/state self-contained and expose tools without leaking credentials.
- Memory/state: in-memory and file persistence implement the same session/snapshot port; `InMemoryAgentHarnessMemory` is a deterministic long-term memory adapter.
- Context: `BudgetedAgentHarnessContextManager` assembles recent history and memory within a token budget and emits an assembly trace.
- Skills: `FileAgentHarnessSkillLoader` exposes summaries first and loads full `SKILL.md` content only when selected.
- HITL/safety: approvals, permissions, safety review, and boundary filters run before sensitive execution or output.
- Observability: typed events, async event queues, operation logs, usage/cost updates, and redaction are emitted at every major step.
- Evals/example: deterministic eval fixtures and a runnable in-process example exercise tools, MCP, memory, HITL, and streaming.

## Core Contracts

- `AgentHarnessModel.stream()` takes provider-neutral messages/tool specs and yields normalized provider events.
- `AgentHarnessTool.execute()` receives validated JSON-object arguments and returns normalized text/image blocks.
- `AgentHarnessPersistence` stores sessions and snapshots behind a replaceable repository port.
- `AgentHarnessExternalToolProvider.discover()` progressively adds external tools per run.
- `AgentHarnessEvent` is the stable stream contract for CLI/server/UI consumers.

## Decisions And Trade-Offs

- Dependency injection over a container: explicit wiring is easier to test and fits the existing codebase.
- Lightweight JSON Schema validation: covers common object/array/enum/type validation without adding a runtime framework.
- MCP as external tool provider: keeps MCP lifecycle outside the core loop while making discovered tools indistinguishable to the agent.
- Summarization is deterministic: no secondary model call is needed to compact history, so resume/evals stay replayable.
- File persistence is opt-in: in-memory remains the default for tests and embedded use; durable storage can be configured.
- `/fast` scope: all deliverables live under `src/main/agent` to honor the requested edit boundary.
