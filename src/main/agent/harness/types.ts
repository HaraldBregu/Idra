import type { ProviderAdapter, ProviderEvent, TranscriptEntry, Usage, JSONSchema, ToolResultBlock } from '../../provider/types';
import type { AgentRunStopReason, AgentToolResultStatus } from '../../../shared/agents/constants';

export type AgentHarnessLayer =
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

export interface AgentHarnessLayerDescriptor {
	layer: AgentHarnessLayer;
	owns: string;
	dependsOn: AgentHarnessLayer[];
}

export const AGENT_HARNESS_LAYERS: AgentHarnessLayerDescriptor[] = [
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

export interface AgentHarnessModelRequest {
	model: string;
	effort?: string;
	system: string;
	messages: TranscriptEntry[];
	tools: Array<{ name: string; description: string; schema: JSONSchema }>;
	maxTokens: number;
	signal?: AbortSignal;
}

export interface AgentHarnessModel {
	stream(req: AgentHarnessModelRequest): AsyncIterable<ProviderEvent>;
}

export interface AgentHarnessModelDescriptor {
	provider: string;
	model: string;
	contextWindowTokens: number;
	supportsTools: boolean;
	supportsStreaming: boolean;
	cost?: { inputUsdPerMillionTokens?: number; outputUsdPerMillionTokens?: number };
}

export interface AgentHarnessModelCandidate {
	provider?: string;
	modelId: string;
	model: AgentHarnessModel;
	effort?: string;
}

export interface AgentHarnessModelRegistry {
	get(provider: string | undefined, model: string): AgentHarnessModelDescriptor | undefined;
	list?(): AgentHarnessModelDescriptor[];
}

export interface AgentHarnessToolContext {
	runId: string;
	sessionId: string;
	session: AgentHarnessSession;
	signal: AbortSignal;
	context: Record<string, unknown>;
	memory: AgentHarnessMemoryRecord[];
	emit(event: AgentHarnessEvent): void;
	log(entry: AgentHarnessOperationLogEntry): Promise<void>;
	requestApproval(request: AgentHarnessApprovalRequest): Promise<AgentHarnessApprovalDecision>;
	runSubagent(input: AgentHarnessSubagentInput): Promise<AgentHarnessRunResult>;
}

export interface AgentHarnessTool<TArgs = Record<string, unknown>, TDetails = unknown> {
	name: string;
	description: string;
	schema: JSONSchema;
	displayName?: string;
	group?: string;
	enabled?: boolean;
	timeoutMs?: number;
	destructive?: boolean;
	externalWrite?: boolean;
	requiresApproval?: boolean | ((args: TArgs, ctx: AgentHarnessToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: AgentHarnessToolContext): Promise<{ status: AgentToolResultStatus; content: ToolResultBlock[]; details?: TDetails }>;
}

export interface AgentHarnessToolRegistry {
	register(tool: AgentHarnessTool): void;
	unregister(name: string): void;
	list(input?: { groups?: string[]; allow?: string[]; deny?: string[]; includeDisabled?: boolean }): AgentHarnessTool[];
	get(name: string): AgentHarnessTool | undefined;
}

export interface AgentHarnessMemoryRecord {
	id: string;
	text: string;
	scope?: string;
	metadata?: Record<string, unknown>;
	createdAt: string;
	updatedAt?: string;
}

export interface AgentHarnessSession {
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

export interface AgentHarnessExecuteInput {
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

export interface AgentHarnessRunResult {
	runId: string;
	sessionId: string;
	finalText: string;
	toolCalls: number;
	usage: Usage;
	costUsd?: number;
	stopReason: AgentRunStopReason;
	session: AgentHarnessSession;
}

export interface AgentHarnessContextBuildResult {
	systemPromptAdditions?: string[];
	messages?: TranscriptEntry[];
	metadata?: Record<string, unknown>;
	trace?: AgentHarnessContextAssemblyTrace;
}

export interface AgentHarnessContextAssemblyTrace {
	budgetTokens: number;
	estimatedTokens: number;
	included: string[];
	dropped: string[];
	summarized: string[];
}

export interface AgentHarnessContextManager {
	build(input: { task: string; session: AgentHarnessSession; memory: AgentHarnessMemoryRecord[]; context: Record<string, unknown>; model?: AgentHarnessModelDescriptor; budgetTokens?: number }): Promise<AgentHarnessContextBuildResult>;
}

export interface AgentHarnessMemory {
	retrieve(input: { task: string; session: AgentHarnessSession; context: Record<string, unknown> }): Promise<AgentHarnessMemoryRecord[]>;
	store(input: { session: AgentHarnessSession; result: AgentHarnessRunResult; context: Record<string, unknown> }): Promise<void>;
}

export interface AgentHarnessApprovalRequest {
	runId: string;
	sessionId: string;
	toolName: string;
	toolCallId: string;
	args: unknown;
	reason: string;
}
export interface AgentHarnessApprovalDecision {
	approved: boolean;
	reason?: string;
	remember?: boolean;
	updatedArgs?: unknown;
}
export interface AgentHarnessApprovalController {
	checkpoint(request: AgentHarnessApprovalRequest): Promise<AgentHarnessApprovalDecision>;
}
export interface AgentHarnessSafetyDecision {
	allowed: boolean;
	reason?: string;
}
export interface AgentHarnessSafetyController {
	reviewTask?(input: { task: string; context: Record<string, unknown> }): Promise<AgentHarnessSafetyDecision>;
	reviewToolCall?(input: { toolName: string; args: unknown; session: AgentHarnessSession; context: Record<string, unknown> }): Promise<AgentHarnessSafetyDecision>;
}
export interface AgentHarnessSnapshot {
	id: string;
	sessionId: string;
	createdAt: string;
	reason?: string;
	session: AgentHarnessSession;
}
export interface AgentHarnessPersistence {
	loadSession(id: string): Promise<AgentHarnessSession | null>;
	saveSession(session: AgentHarnessSession): Promise<void>;
	listSessions(): Promise<AgentHarnessSession[]>;
	deleteSession(id: string): Promise<void>;
	saveSnapshot(snapshot: AgentHarnessSnapshot): Promise<void>;
	loadSnapshot(id: string): Promise<AgentHarnessSnapshot | null>;
}
export type AgentHarnessHookName = 'before_run' | 'after_run' | 'before_model_call' | 'after_model_call' | 'before_tool_call' | 'after_tool_call';
export interface AgentHarnessHook {
	name?: string;
	handle(input: { name: AgentHarnessHookName; payload: unknown }): Promise<void> | void;
}
export interface AgentHarnessOperationLogEntry {
	runId?: string;
	sessionId?: string;
	type: string;
	timestamp: string;
	data?: Record<string, unknown>;
}
export interface AgentHarnessOperationLogger {
	append(entry: AgentHarnessOperationLogEntry): Promise<void>;
}
export interface AgentHarnessSecretRedactor {
	redact(value: unknown): unknown;
}
export interface AgentHarnessToolResultOptimizer {
	optimize(input: { toolName: string; content: ToolResultBlock[]; details?: unknown; context: AgentHarnessToolContext }): Promise<ToolResultBlock[]>;
}
export interface AgentHarnessPermissions {
	allowTools?: string[];
	denyTools?: string[];
	allowSkills?: string[];
	denySkills?: string[];
	requireApprovalForDestructiveTools?: boolean;
	requireApprovalForExternalWrites?: boolean;
}
export interface AgentHarnessBoundaryFilter {
	filterInput?(input: { task: string; context: Record<string, unknown> }): Promise<AgentHarnessSafetyDecision> | AgentHarnessSafetyDecision;
	filterOutput?(input: { text: string; session: AgentHarnessSession }): Promise<AgentHarnessSafetyDecision> | AgentHarnessSafetyDecision;
}
export interface AgentHarnessExternalToolProvider {
	discover(input: { task: string; session: AgentHarnessSession; context: Record<string, unknown> }): Promise<AgentHarnessTool[]>;
	close?(): Promise<void>;
}
export interface AgentHarnessSkill {
	name: string;
	description?: string;
	instructions?: string;
	tools?: AgentHarnessTool[];
}
export interface AgentHarnessSkillLoader {
	list?(input: { session: AgentHarnessSession; context: Record<string, unknown> }): Promise<Array<Pick<AgentHarnessSkill, 'name' | 'description'>>>;
	select?(input: { task: string; session: AgentHarnessSession; context: Record<string, unknown>; candidates: Array<Pick<AgentHarnessSkill, 'name' | 'description'>> }): Promise<string[]>;
	load(name: string, input: { session: AgentHarnessSession; context: Record<string, unknown> }): Promise<AgentHarnessSkill>;
}
export interface AgentHarnessSubagentInput {
	task: string;
	agentId?: string;
	sessionId?: string;
	context?: Record<string, unknown>;
	requiredSkills?: string[];
}
export interface AgentHarnessSubagentRuntime {
	run(input: AgentHarnessSubagentInput & { parentSession: AgentHarnessSession }): Promise<AgentHarnessRunResult>;
}
export type AgentHarnessEvent =
	| { type: 'run.started'; runId: string; sessionId: string; task: string }
	| { type: 'run.finished'; runId: string; sessionId: string; stopReason: AgentRunStopReason; outputChars: number; usage?: Usage; costUsd?: number }
	| { type: 'run.cancelled'; runId: string; sessionId: string }
	| { type: 'run.error'; runId: string; sessionId: string; error: AgentHarnessErrorShape }
	| { type: 'model.request'; runId: string; sessionId: string; iteration: number }
	| { type: 'model.delta'; runId: string; sessionId: string; iteration: number; text: string }
	| { type: 'model.response'; runId: string; sessionId: string; iteration: number; usage: Usage; costUsd?: number }
	| { type: 'usage.updated'; runId: string; sessionId: string; usage: Usage; costUsd?: number }
	| { type: 'context.assembled'; runId: string; sessionId: string; trace: AgentHarnessContextAssemblyTrace }
	| { type: 'memory.read'; runId: string; sessionId: string; count: number }
	| { type: 'memory.write'; runId: string; sessionId: string; count: number }
	| { type: 'tool.discovered'; provider?: string; count: number; names: string[] }
	| { type: 'tool.started'; runId: string; sessionId: string; toolName: string; toolCallId: string }
	| { type: 'tool.finished'; runId: string; sessionId: string; toolName: string; toolCallId: string; status: AgentToolResultStatus; durationMs?: number }
	| { type: 'tool.error'; runId: string; sessionId: string; toolName: string; toolCallId: string; error: AgentHarnessErrorShape }
	| { type: 'skill.loaded'; name: string }
	| { type: 'subagent.started'; runId: string; sessionId: string; parentSessionId?: string; task: string }
	| { type: 'subagent.finished'; runId: string; sessionId: string; parentSessionId?: string; stopReason: AgentRunStopReason }
	| { type: 'approval.requested'; request: AgentHarnessApprovalRequest }
	| { type: 'approval.resolved'; request: AgentHarnessApprovalRequest; decision: AgentHarnessApprovalDecision }
	| { type: 'snapshot.created'; snapshotId: string; sessionId: string }
	| { type: 'mcp.server.connecting' | 'mcp.server.connected' | 'mcp.server.disconnected'; server: string }
	| { type: 'mcp.server.error'; server: string; error: AgentHarnessErrorShape }
	| { type: 'mcp.inventory'; server: string; tools: number; resources: number; prompts: number };

export interface AgentHarnessErrorShape {
	name: string;
	message: string;
	code?: string;
	recoverable: boolean;
	details?: unknown;
}
export interface AgentHarnessEventSink {
	emit(event: AgentHarnessEvent): void;
}
export interface AgentHarnessConfig {
	id?: string;
	label?: string;
	provider?: string;
	modelId: string;
	effort?: string;
	systemPrompt?: string;
	model: AgentHarnessModel;
	models?: { registry?: AgentHarnessModelRegistry; fallbacks?: AgentHarnessModelCandidate[]; retry?: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number } };
	tools?: AgentHarnessTool[];
	toolRegistry?: AgentHarnessToolRegistry;
	context?: AgentHarnessContextManager;
	memory?: AgentHarnessMemory;
	approvals?: AgentHarnessApprovalController;
	safety?: AgentHarnessSafetyController;
	boundary?: AgentHarnessBoundaryFilter;
	permissions?: AgentHarnessPermissions;
	persistence?: AgentHarnessPersistence;
	hooks?: AgentHarnessHook[];
	events?: AgentHarnessEventSink;
	externalTools?: AgentHarnessExternalToolProvider[];
	skills?: AgentHarnessSkillLoader;
	subagents?: AgentHarnessSubagentRuntime;
	logs?: AgentHarnessOperationLogger;
	secrets?: AgentHarnessSecretRedactor;
	resultOptimizer?: AgentHarnessToolResultOptimizer;
	runtime?: { maxIterations?: number; maxTokens?: number; maxInputTokens?: number; maxOutputTokens?: number; maxCostUsd?: number; timeoutMs?: number; toolTimeoutMs?: number; contextReserveTokens?: number };
}
export interface ExecutableAgentHarness {
	id: string;
	label: string;
	layers: AgentHarnessLayerDescriptor[];
	execute(input: AgentHarnessExecuteInput): Promise<AgentHarnessRunResult>;
	stream(input: AgentHarnessExecuteInput): AsyncIterable<AgentHarnessEvent>;
	on(type: AgentHarnessEvent['type'], handler: (event: AgentHarnessEvent) => void): () => void;
	getSession(sessionId: string): Promise<AgentHarnessSession | null>;
	listSessions(): Promise<AgentHarnessSession[]>;
	resetSession(sessionId: string): Promise<void>;
	abortRun(runId: string): void;
	createSnapshot(sessionId: string, reason?: string): Promise<AgentHarnessSnapshot>;
	undo(snapshotId: string): Promise<AgentHarnessSession>;
	runSubagent(input: AgentHarnessSubagentInput & { parentSessionId?: string }): Promise<AgentHarnessRunResult>;
}

export interface AgentHarnessAttemptParams {
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
export interface AgentHarnessAttemptResult {
	finalText: string;
	toolCalls: number;
	usage: Usage;
	stopReason: AgentRunStopReason;
	session: unknown;
	agentHarnessId?: string;
	agentHarnessResultClassification?: string;
}
export interface AgentHarnessSupportDecision {
	supported: boolean;
	priority?: number;
	reason?: string;
}
export interface AgentHarness {
	id: string;
	label: string;
	supports(input: { provider: string; modelId: string }): AgentHarnessSupportDecision;
	runAttempt(params: AgentHarnessAttemptParams): Promise<AgentHarnessAttemptResult>;
	compact?(params: unknown): Promise<unknown>;
	reset?(input: { reason: string }): void | Promise<void>;
	classify?(result: AgentHarnessAttemptResult, params: AgentHarnessAttemptParams): string | undefined;
}
