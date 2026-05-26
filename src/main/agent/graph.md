# Agent Graph

This graph shows how `src/main/agent` orchestrates a run across entrypoints, routing, tools, connectors, skills, history, system prompt construction, provider streaming, and persistence.

```mermaid
flowchart TD
	subgraph Entrypoints
		UI["Renderer UI"]
		IPC["AgentIpc<br/>src/main/ipc/agent-ipc.ts"]
		Channels["ChannelRegistry<br/>src/main/channels/registry.ts"]
		Route["Agent routing<br/>routing/*"]
		Heartbeat["HeartbeatService"]
		TaskRuns["Tasks and cron runs"]
	end

	subgraph Bootstrap
		BootstrapServices["bootstrapServices()<br/>src/main/bootstrap.ts"]
		Deps["AgentServiceDependencies<br/>store, workspace, policy, tools,<br/>connectors, skills, mcp, tasks"]
	end

	subgraph Preparation
		Send["AgentService.send()<br/>service.ts"]
		Runtime["Runtime map<br/>abort controller + run records"]
		Config["StoreService<br/>agent config + provider/model"]
		ProviderFactory["Provider factory<br/>ProviderAdapter"]
		SessionLoad["loadSession()<br/>session/store.ts"]
		History["Session history<br/>transcript + plan + compaction markers"]
		Workspace["WorkspaceService<br/>startup workspace files"]
		Policy["PolicyService<br/>evaluateToolRequest()"]
		ToolContext["ToolContext<br/>workspace, session, plan, services"]
	end

	subgraph Capabilities
		NeedTools{"Use tools?"}
		LocalTools["ToolService.createDefaultTools()<br/>file + filesystem + cron catalog"]
		ToolSelect["ToolService.selectToolsForTurn()<br/>rank and provider-normalize tools"]
		Connectors["ConnectorsService.createAgentTools()<br/>configured connector tools"]
		Skills["SkillsService.list/load()<br/>matching or configured skills"]
		CapabilityResolve["AgentCapabilityService.resolveForPrompt()<br/>capabilities/service.ts"]
		SelectedTools["Selected tools<br/>local + matching connectors"]
		SkillPrompt["Skill prompt additions"]
		Mcp["McpRegistry<br/>registered service"]
		McpNote["MCP note<br/>The current default AgentService path injects mcpRegistry into services,<br/>but does not call McpRegistry.buildTools() directly."]
	end

	subgraph Prompt
		StartupFiles["Startup context<br/>AGENTS, SOUL, IDENTITY, USER,<br/>HEARTBEAT, BOOTSTRAP"]
		SystemPrompt["buildSystemPrompt()<br/>system-prompt.ts"]
		PromptForTurn["System prompt for turn<br/>base prompt + skills + tool suffix"]
		BeforeRun["Before-agent-run hooks<br/>before-agent-run.ts"]
	end

	subgraph Execution
		Execute["AgentExecutionService.execute()<br/>run.ts"]
		ProviderStream["ProviderAdapter.stream()<br/>model messages + tool schemas"]
		ModelEvents{"Provider stream events"}
		TextDelta["text_delta<br/>stream to UI/channel"]
		ToolCall["tool_call<br/>parse JSON args"]
		ToolGuard["ToolService.beforeCall()<br/>guards + policy"]
		ToolExec["ToolService.executeToolWithManagement()"]
		LocalHandlers["Local tool handlers<br/>files, filesystem, cron"]
		ConnectorHandlers["Connector runtime strategies<br/>Gmail, Calendar, Drive, etc."]
		ToolResult["Tool result blocks<br/>text/image + status"]
		Overflow["ContextOverflowError"]
		Compact["compact()<br/>compaction.ts"]
		MemoryFlush["flushSessionMemoryBeforeCompaction()<br/>memory-runtime.ts"]
	end

	subgraph Subagents
		SubagentTools["Subagent tools<br/>sessions_spawn + subagents"]
		SubagentService["SubagentSpawnService"]
		TaskManager["TasksService<br/>subagent.run task"]
		SubagentHandler["SubagentRunTaskHandler"]
	end

	subgraph Persistence
		RunLogger["AgentRunLogger<br/>start, iteration, tool, finish"]
		Save["saveSession()<br/>sanitized transcript + status"]
		Final["Final text returned"]
	end

	UI --> IPC --> Send
	Channels --> Route --> Send
	Heartbeat --> Send
	TaskRuns --> Send

	BootstrapServices --> Deps --> Send
	Send --> Runtime
	Send --> Config --> ProviderFactory
	Send --> SessionLoad --> History
	Send --> Workspace --> StartupFiles
	Send --> Policy --> NeedTools
	Send --> ToolContext
	Deps --> ToolContext

	NeedTools --> LocalTools --> ToolSelect
	ToolSelect --> CapabilityResolve
	Connectors --> CapabilityResolve
	Skills --> CapabilityResolve
	Mcp -. injected through ToolContext.services .-> ToolContext
	Mcp -. current behavior .-> McpNote
	CapabilityResolve --> SelectedTools
	CapabilityResolve --> SkillPrompt

	StartupFiles --> SystemPrompt
	SelectedTools --> SystemPrompt
	SystemPrompt --> PromptForTurn
	SkillPrompt --> PromptForTurn
	ToolSelect -. optional tool-selection suffix .-> PromptForTurn
	PromptForTurn --> BeforeRun
	History --> BeforeRun

	BeforeRun -- pass --> Execute
	BeforeRun -- block --> Save
	ProviderFactory --> Execute
	History --> Execute
	SelectedTools --> Execute
	ToolContext --> Execute
	Execute --> ProviderStream --> ModelEvents
	ModelEvents --> TextDelta --> Final
	ModelEvents --> ToolCall --> ToolGuard --> ToolExec
	ToolExec --> LocalHandlers --> ToolResult
	ToolExec --> ConnectorHandlers --> ToolResult
	ToolResult --> History
	History --> ProviderStream

	ProviderStream --> Overflow --> MemoryFlush --> Compact --> History
	Execute --> RunLogger
	Execute --> Save --> History
	Execute --> Final
	Final --> IPC
	Final --> Channels

	SubagentTools -. when exposed by a custom tools factory .-> ToolExec
	ToolExec -. sessions_spawn .-> SubagentService
	SubagentService --> TaskManager --> SubagentHandler --> Send
```

Key reads:

- `service.ts` prepares the run: resolves provider/model, loads session history, builds tool context, selects capabilities, builds the system prompt, runs preflight hooks, and saves the completed session.
- `run.ts` owns the model loop: stream provider events, append assistant/tool transcript entries, execute tool calls, compact on context overflow, and return final text.
- Connector tools are included through `AgentCapabilityService`; skills are included as prompt additions.
- `McpRegistry` is registered and available through dependencies, but the default agent run path currently does not build provider MCP tools from it.
