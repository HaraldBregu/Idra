# Agent Module Graph

This graph is scoped to `src/main/agent` only. External app services are collapsed into boundary nodes so the diagram shows the agent module's internal files and subfolders.

```mermaid
flowchart TD
	subgraph PublicAPI
		Index["index.ts<br/>barrel exports"]
	end

	subgraph Boundary
		Callers["Agent callers<br/>UI, channels, heartbeat, tasks"]
		ExternalDeps["Injected dependencies<br/>store, workspace, policy, tools,<br/>connectors, skills, mcp, tasks"]
		ExternalRuntime["Runtime contracts<br/>provider, session, run logger,<br/>tool context, memory flush"]
	end

	subgraph Core
		Service["service.ts<br/>AgentService"]
		Run["run.ts<br/>AgentExecutionService"]
		SystemPrompt["system-prompt.ts<br/>buildSystemPrompt"]
		BeforeRun["before-agent-run.ts<br/>evaluate hooks"]
		Compaction["compaction.ts<br/>compact transcript"]
		Logger["logger.ts<br/>agentLogger"]
	end

	subgraph Capabilities
		CapIndex["capabilities/index.ts"]
		CapService["capabilities/service.ts<br/>AgentCapabilityService"]
		CapTypes["capabilities/types.ts"]
	end

	subgraph Routing
		RouteIndex["routing/index.ts"]
		Bindings["routing/bindings.ts"]
		ResolveRoute["routing/resolve-route.ts"]
		SessionKey["routing/session-key.ts"]
		RouteTypes["routing/types.ts"]
	end

	subgraph Subagents
		SubIndex["subagents/index.ts"]
		Registry["subagents/registry.ts"]
		SpawnService["subagents/spawn-service.ts"]
		SpawnTool["subagents/spawn-tool.ts"]
		ControlTool["subagents/control-tool.ts"]
		TaskHandler["subagents/task-handler.ts"]
		SubTypes["subagents/types.ts"]
	end

	Index --> Service
	Index --> Run
	Index --> CapIndex
	Index --> SubIndex
	Index --> RouteIndex
	Index --> BeforeRun
	Index --> SystemPrompt

	Callers --> Service
	ExternalDeps --> Service
	ExternalRuntime --> Service

	Service --> CapService
	Service --> SystemPrompt
	Service --> BeforeRun
	Service --> Run
	Service --> ExternalRuntime

	Run --> Compaction
	Run --> Logger
	Run --> ExternalRuntime
	BeforeRun --> Logger
	Compaction --> Logger
	Compaction --> ExternalRuntime

	CapIndex --> CapService
	CapIndex --> CapTypes
	CapService --> CapTypes
	CapService --> ExternalDeps

	RouteIndex --> Bindings
	RouteIndex --> ResolveRoute
	RouteIndex --> SessionKey
	RouteIndex --> RouteTypes
	ResolveRoute --> Bindings
	ResolveRoute --> SessionKey
	ResolveRoute --> RouteTypes
	SessionKey --> RouteTypes

	SubIndex --> Registry
	SubIndex --> SpawnService
	SubIndex --> SpawnTool
	SubIndex --> ControlTool
	SubIndex --> TaskHandler
	SubIndex --> SubTypes
	Registry --> SubTypes
	SpawnService --> Registry
	SpawnService --> TaskHandler
	SpawnService --> SubTypes
	SpawnService --> SessionKey
	SpawnTool --> SpawnService
	SpawnTool --> SubTypes
	ControlTool --> SpawnService
	ControlTool --> SubTypes
	TaskHandler --> Service
	TaskHandler --> Registry
	TaskHandler --> SubTypes
```

Key reads:

- `service.ts` is the agent module orchestrator: it calls capability resolution, system prompt construction, before-run hooks, and the execution service.
- `run.ts` owns the model loop and calls `compaction.ts` when the provider reports context overflow.
- `capabilities/`, `routing/`, and `subagents/` are shown as internal agent submodules, with their own index files and type files.
- External services such as tools, connectors, skills, MCP, sessions, providers, and task runners are intentionally collapsed into boundary nodes because they live outside `src/main/agent`.
