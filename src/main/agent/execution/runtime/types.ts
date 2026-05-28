import type { ProviderAdapter, ProviderEvent, TranscriptEntry, Usage, JSONSchema, ToolResultBlock } from '../../../provider/types';
import type { AgentRunStopReason, AgentToolResultStatus } from '../../../../shared/agents/constants';

export type AgentRuntimeLayer =
	| 'public_api'
	| 'scaffolding'
	| 'runtime'
	| 'model_role'
	| 'tools'
	| 'context'
	| 'memory'
	| 'human_approval'
	| 'safety'
	| 'subagents'
	| 'persistence'
	| 'hooks'
	| 'external_tools_skills'
	| 'events_observability';

export interface AgentRuntimeLayerDescriptor {
	layer: AgentRuntimeLayer;
	owns: string;
	dependsOn: AgentRuntimeLayer[];
}

export const AGENT_RUNTIME_LAYERS: AgentRuntimeLayerDescriptor[] = [
	{ layer: 'public_api', owns: 'factory and embedding surface', dependsOn: ['scaffolding'] },
	{ layer: 'scaffolding', owns: 'dependency assembly and defaults', dependsOn: ['runtime'] },
	{ layer: 'runtime', owns: 'run loop, execution, stream, and subagents', dependsOn: ['model_role', 'tools', 'context', 'persistence', 'hooks'] },
	{ layer: 'model_role', owns: 'provider-neutral model streaming', dependsOn: [] },
	{ layer: 'tools', owns: 'tool schemas, permission filtering, gates, and result shaping', dependsOn: ['human_approval', 'safety'] },
	{ layer: 'context', owns: 'context assembly and compaction', dependsOn: ['memory', 'external_tools_skills'] },
	{ layer: 'memory', owns: 'retrieval and durable facts', dependsOn: ['persistence'] },
	{ layer: 'human_approval', owns: 'approval checkpoints', dependsOn: ['events_observability'] },
	{ layer: 'safety', owns: 'task and tool safety decisions', dependsOn: [] },
	{ layer: 'subagents', owns: 'isolated child runs', dependsOn: ['runtime'] },
	{ layer: 'persistence', owns: 'sessions, snapshots, and operation logs', dependsOn: [] },
	{ layer: 'hooks', owns: 'lifecycle observers', dependsOn: [] },
	{ layer: 'external_tools_skills', owns: 'MCP, connector, and skill discovery', dependsOn: ['tools'] },
	{ layer: 'events_observability', owns: 'typed event emission', dependsOn: [] },
];

export interface AgentRuntimeModelRequest {
	model: string;
	effort?: string;
	system: string;
	messages: TranscriptEntry[];
	tools: Array<{ name: string; description: string; schema: JSONSchema }>;
	maxTokens: number;
	signal?: AbortSignal;
}

export interface AgentRuntimeModel {
	stream(req: AgentRuntimeModelRequest): AsyncIterable<ProviderEvent>;
}

export interface AgentRuntimeModelDescriptor {
	provider: string;
	model: string;
	contextWindowTokens: number;
	supportsTools: boolean;
	supportsStreaming: boolean;
	cost?: { inputUsdPerMillionTokens?: number; outputUsdPerMillionTokens?: number };
}

export interface AgentRuntimeModelCandidate {
	provider?: string;
	modelId: string;
	model: AgentRuntimeModel;
	effort?: string;
}

export interface AgentRuntimeModelRegistry {
	get(provider: string | undefined, model: string): AgentRuntimeModelDescriptor | undefined;
	list?(): AgentRuntimeModelDescriptor[];
}

export interface AgentRuntimeToolContext {
	runId: string;
	sessionId: string;
	session: AgentRuntimeSession;
	signal: AbortSignal;
	context: Record<string, unknown>;
	memory: AgentRuntimeMemoryRecord[];
	emit(event: AgentRuntimeEvent): void;
	log(entry: AgentRuntimeOperationLogEntry): Promise<void>;
	requestApproval(request: AgentRuntimeApprovalRequest): Promise<AgentRuntimeApprovalDecision>;
	runSubagent(input: AgentRuntimeSubagentInput): Promise<AgentRuntimeRunResult>;
}

export interface AgentRuntimeTool<TArgs = Record<string, unknown>, TDetails = unknown> {
	name: string;
	description: string;
	schema: JSONSchema;
	displayName?: string;
	group?: string;
	enabled?: boolean;
	timeoutMs?: number;
	destructive?: boolean;
	externalWrite?: boolean;
	requiresApproval?: boolean | ((args: TArgs, ctx: AgentRuntimeToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: AgentRuntimeToolContext): Promise<{ status: AgentToolResultStatus; content: ToolResultBlock[]; details?: TDetails }>;
}

export interface AgentRuntimeToolRegistry {
	register(tool: AgentRuntimeTool): void;
	unregister(name: string): void;
	list(input?: { groups?: string[]; allow?: string[]; deny?: string[]; includeDisabled?: boolean }): AgentRuntimeTool[];
	get(name: string): AgentRuntimeTool | undefined;
}

export interface AgentRuntimeMemoryRecord {
	id: string;
	text: string;
	scope?: string;
	metadata?: Record<string, unknown>;
	createdAt: string;
	updatedAt?: string;
}

export interface AgentRuntimeSession {
	id: string;
	createdAt: string;
	updatedAt: string;
	status: 'active' | 'waiting' | 'completed' | 'failed' | 'cancelled';
	model: string;
	provider?: string;
	parentSessionId?: string;
	metadata?: Record<string, unknown>;
	transcript: TranscriptEntry[];
	plan: Array<{ task: string; status: 'pending' | 'in_progress' | 'done' }>;
	compactionMarkers: Array<Record<string, unknown>>;
}

export interface AgentRuntimeExecuteInput {
	task: string;
	sessionId?: string;
	runId?: string;
	parentSessionId?: string;
	context?: Record<string, unknown>;
	requiredSkills?: string[];
	enabledTools?: string[];
	disabledTools?: string[];
	toolGroups?: string[];
	maxIterations?: number;
	maxTokens?: number;
	maxCostUsd?: number;
	timeoutMs?: number;
	signal?: AbortSignal;
	metadata?: Record<string, unknown>;
}

export interface AgentRuntimeRunResult {
	runId: string;
	sessionId: string;
	finalText: string;
	toolCalls: number;
	usage: Usage;
	costUsd?: number;
	stopReason: AgentRunStopReason;
	session: AgentRuntimeSession;
}

export interface AgentRuntimeContextBuildResult {
	systemPromptAdditions?: string[];
	messages?: TranscriptEntry[];
	metadata?: Record<string, unknown>;
	trace?: AgentRuntimeContextAssemblyTrace;
}

export interface AgentRuntimeContextAssemblyTrace {
	budgetTokens: number;
	estimatedTokens: number;
	included: string[];
	dropped: string[];
	summarized: string[];
}

export interface AgentRuntimeContextManager {
	build(input: { task: string; session: AgentRuntimeSession; memory: AgentRuntimeMemoryRecord[]; context: Record<string, unknown>; model?: AgentRuntimeModelDescriptor; budgetTokens?: number }): Promise<AgentRuntimeContextBuildResult>;
}

export interface AgentRuntimeMemory {
	retrieve(input: { task: string; session: AgentRuntimeSession; context: Record<string, unknown> }): Promise<AgentRuntimeMemoryRecord[]>;
	store(input: { session: AgentRuntimeSession; result: AgentRuntimeRunResult; context: Record<string, unknown> }): Promise<void>;
}

export interface AgentRuntimeApprovalRequest {
	runId: string;
	sessionId: string;
	toolName: string;
	toolCallId: string;
	args: unknown;
	reason: string;
}
export interface AgentRuntimeApprovalDecision {
	approved: boolean;
	reason?: string;
	remember?: boolean;
	updatedArgs?: unknown;
}
export interface AgentRuntimeApprovalController {
	checkpoint(request: AgentRuntimeApprovalRequest): Promise<AgentRuntimeApprovalDecision>;
}
export interface AgentRuntimeSafetyDecision {
	allowed: boolean;
	reason?: string;
}
export interface AgentRuntimeSafetyController {
	reviewTask?(input: { task: string; context: Record<string, unknown> }): Promise<AgentRuntimeSafetyDecision>;
	reviewToolCall?(input: { toolName: string; args: unknown; session: AgentRuntimeSession; context: Record<string, unknown> }): Promise<AgentRuntimeSafetyDecision>;
}
export interface AgentRuntimeSnapshot {
	id: string;
	sessionId: string;
	createdAt: string;
	reason?: string;
	session: AgentRuntimeSession;
}
export interface AgentRuntimePersistence {
	loadSession(id: string): Promise<AgentRuntimeSession | null>;
	saveSession(session: AgentRuntimeSession): Promise<void>;
	listSessions(): Promise<AgentRuntimeSession[]>;
	deleteSession(id: string): Promise<void>;
	saveSnapshot(snapshot: AgentRuntimeSnapshot): Promise<void>;
	loadSnapshot(id: string): Promise<AgentRuntimeSnapshot | null>;
}
export type AgentRuntimeHookName = 'before_run' | 'after_run' | 'before_model_call' | 'after_model_call' | 'before_tool_call' | 'after_tool_call';
export interface AgentRuntimeHook {
	name?: string;
	handle(input: { name: AgentRuntimeHookName; payload: unknown }): Promise<void> | void;
}
export interface AgentRuntimeOperationLogEntry {
	runId?: string;
	sessionId?: string;
	type: string;
	timestamp: string;
	data?: Record<string, unknown>;
}
export interface AgentRuntimeOperationLogger {
	append(entry: AgentRuntimeOperationLogEntry): Promise<void>;
}
export interface AgentRuntimeSecretRedactor {
	redact(value: unknown): unknown;
}
export interface AgentRuntimeToolResultOptimizer {
	optimize(input: { toolName: string; content: ToolResultBlock[]; details?: unknown; context: AgentRuntimeToolContext }): Promise<ToolResultBlock[]>;
}
export interface AgentRuntimePermissions {
	allowTools?: string[];
	denyTools?: string[];
	allowSkills?: string[];
	denySkills?: string[];
	requireApprovalForDestructiveTools?: boolean;
	requireApprovalForExternalWrites?: boolean;
}
export interface AgentRuntimeBoundaryFilter {
	filterInput?(input: { task: string; context: Record<string, unknown> }): Promise<AgentRuntimeSafetyDecision> | AgentRuntimeSafetyDecision;
	filterOutput?(input: { text: string; session: AgentRuntimeSession }): Promise<AgentRuntimeSafetyDecision> | AgentRuntimeSafetyDecision;
}
export interface AgentRuntimeExternalToolProvider {
	discover(input: { task: string; session: AgentRuntimeSession; context: Record<string, unknown> }): Promise<AgentRuntimeTool[]>;
	close?(): Promise<void>;
}
export interface AgentRuntimeSkill {
	name: string;
	description?: string;
	instructions?: string;
	tools?: AgentRuntimeTool[];
}
export interface AgentRuntimeSkillLoader {
	list?(input: { session: AgentRuntimeSession; context: Record<string, unknown> }): Promise<Array<Pick<AgentRuntimeSkill, 'name' | 'description'>>>;
	select?(input: { task: string; session: AgentRuntimeSession; context: Record<string, unknown>; candidates: Array<Pick<AgentRuntimeSkill, 'name' | 'description'>> }): Promise<string[]>;
	load(name: string, input: { session: AgentRuntimeSession; context: Record<string, unknown> }): Promise<AgentRuntimeSkill>;
}
export interface AgentRuntimeSubagentInput {
	task: string;
	agentId?: string;
	sessionId?: string;
	context?: Record<string, unknown>;
	requiredSkills?: string[];
}
export interface AgentSubagentRuntime {
	run(input: AgentRuntimeSubagentInput & { parentSession: AgentRuntimeSession }): Promise<AgentRuntimeRunResult>;
}
export type AgentRuntimeEvent =
	| { type: 'run.started'; runId: string; sessionId: string; task: string }
	| { type: 'run.finished'; runId: string; sessionId: string; stopReason: AgentRunStopReason; outputChars: number; usage?: Usage; costUsd?: number }
	| { type: 'run.cancelled'; runId: string; sessionId: string }
	| { type: 'run.error'; runId: string; sessionId: string; error: AgentRuntimeErrorShape }
	| { type: 'model.request'; runId: string; sessionId: string; iteration: number }
	| { type: 'model.delta'; runId: string; sessionId: string; iteration: number; text: string }
	| { type: 'model.response'; runId: string; sessionId: string; iteration: number; usage: Usage; costUsd?: number }
	| { type: 'usage.updated'; runId: string; sessionId: string; usage: Usage; costUsd?: number }
	| { type: 'context.assembled'; runId: string; sessionId: string; trace: AgentRuntimeContextAssemblyTrace }
	| { type: 'memory.read'; runId: string; sessionId: string; count: number }
	| { type: 'memory.write'; runId: string; sessionId: string; count: number }
	| { type: 'tool.discovered'; provider?: string; count: number; names: string[] }
	| { type: 'tool.started'; runId: string; sessionId: string; toolName: string; toolCallId: string }
	| { type: 'tool.finished'; runId: string; sessionId: string; toolName: string; toolCallId: string; status: AgentToolResultStatus; durationMs?: number }
	| { type: 'tool.error'; runId: string; sessionId: string; toolName: string; toolCallId: string; error: AgentRuntimeErrorShape }
	| { type: 'skill.loaded'; name: string }
	| { type: 'subagent.started'; runId: string; sessionId: string; parentSessionId?: string; task: string }
	| { type: 'subagent.finished'; runId: string; sessionId: string; parentSessionId?: string; stopReason: AgentRunStopReason }
	| { type: 'approval.requested'; request: AgentRuntimeApprovalRequest }
	| { type: 'approval.resolved'; request: AgentRuntimeApprovalRequest; decision: AgentRuntimeApprovalDecision }
	| { type: 'snapshot.created'; snapshotId: string; sessionId: string }
	| { type: 'mcp.server.connecting' | 'mcp.server.connected' | 'mcp.server.disconnected'; server: string }
	| { type: 'mcp.server.error'; server: string; error: AgentRuntimeErrorShape }
	| { type: 'mcp.inventory'; server: string; tools: number; resources: number; prompts: number };

export interface AgentRuntimeErrorShape {
	name: string;
	message: string;
	code?: string;
	recoverable: boolean;
	details?: unknown;
}
export interface AgentRuntimeEventSink {
	emit(event: AgentRuntimeEvent): void;
}
export interface AgentRuntimeConfig {
	id?: string;
	label?: string;
	provider?: string;
	modelId: string;
	effort?: string;
	systemPrompt?: string;
	model: AgentRuntimeModel;
	models?: { registry?: AgentRuntimeModelRegistry; fallbacks?: AgentRuntimeModelCandidate[]; retry?: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number } };
	planner?: { plan(input: { task: string; session: AgentRuntimeSession; context: Record<string, unknown> }): Promise<Array<{ task: string; status: 'pending' | 'in_progress' | 'done' }>> };
	tools?: AgentRuntimeTool[];
	toolRegistry?: AgentRuntimeToolRegistry;
	context?: AgentRuntimeContextManager;
	memory?: AgentRuntimeMemory;
	approvals?: AgentRuntimeApprovalController;
	safety?: AgentRuntimeSafetyController;
	boundary?: AgentRuntimeBoundaryFilter;
	permissions?: AgentRuntimePermissions;
	persistence?: AgentRuntimePersistence;
	hooks?: AgentRuntimeHook[];
	events?: AgentRuntimeEventSink;
	externalTools?: AgentRuntimeExternalToolProvider[];
	skills?: AgentRuntimeSkillLoader;
	subagents?: AgentSubagentRuntime;
	logs?: AgentRuntimeOperationLogger;
	secrets?: AgentRuntimeSecretRedactor;
	resultOptimizer?: AgentRuntimeToolResultOptimizer;
	runtime?: { maxIterations?: number; maxTokens?: number; maxInputTokens?: number; maxOutputTokens?: number; maxCostUsd?: number; timeoutMs?: number; toolTimeoutMs?: number; contextReserveTokens?: number };
}
export interface ExecutableAgentRuntime {
	id: string;
	label: string;
	layers: AgentRuntimeLayerDescriptor[];
	execute(input: AgentRuntimeExecuteInput): Promise<AgentRuntimeRunResult>;
	stream(input: AgentRuntimeExecuteInput): AsyncIterable<AgentRuntimeEvent>;
	on(type: AgentRuntimeEvent['type'], handler: (event: AgentRuntimeEvent) => void): () => void;
	getSession(sessionId: string): Promise<AgentRuntimeSession | null>;
	listSessions(): Promise<AgentRuntimeSession[]>;
	resetSession(sessionId: string): Promise<void>;
	abortRun(runId: string): void;
	createSnapshot(sessionId: string, reason?: string): Promise<AgentRuntimeSnapshot>;
	undo(snapshotId: string): Promise<AgentRuntimeSession>;
	runSubagent(input: AgentRuntimeSubagentInput & { parentSessionId?: string }): Promise<AgentRuntimeRunResult>;
}

export interface AgentRuntimeAttemptParams {
	runId: string;
	provider: string;
	model: string;
	userMessage: string;
	systemPrompt: string;
	session: { id: string; transcript: TranscriptEntry[] };
	tools: unknown[];
	ctx: unknown;
	providerAdapter: ProviderAdapter;
	signal?: AbortSignal;
}
export interface AgentRuntimeAttemptResult {
	finalText: string;
	toolCalls: number;
	usage: Usage;
	stopReason: AgentRunStopReason;
	session: unknown;
	agentRuntimeId?: string;
	agentRuntimeResultClassification?: string;
}
export interface AgentRuntimeSupportDecision {
	supported: boolean;
	priority?: number;
	reason?: string;
}
export interface AgentRuntime {
	id: string;
	label: string;
	supports(input: { provider: string; modelId: string }): AgentRuntimeSupportDecision;
	runAttempt(params: AgentRuntimeAttemptParams): Promise<AgentRuntimeAttemptResult>;
	compact?(params: unknown): Promise<unknown>;
	reset?(input: { reason: string }): void | Promise<void>;
	classify?(result: AgentRuntimeAttemptResult, params: AgentRuntimeAttemptParams): string | undefined;
}
