import type { EventBus } from '../services/event-bus';
import type { CronService } from '../cron';
import type { LoggerService } from '../observability';
import type { StoreService } from '../store';
import type { ConnectorsService } from '../connectors';
import type { SkillsService } from '../skills';
import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentCapabilityServicePort } from '../capabilities';
import type { ProviderSpec } from '../llm/router';
import type { JSONSchema, ProviderAdapter, ToolResultBlock } from '../llm/types';
import type { AgentRunState, ModelReasoningEffort } from '../../shared/agents/service';
import type { AgentResponseEvent, AgentToolResultStatus } from '../../shared/agents/events';
import type {
	AgentConfig,
	AgentRouteBinding,
	AgentRoutingSettings,
	AgentSessionMetadata,
} from '../../shared/store';
import type { AgentCapabilityServiceKind } from '../../shared/agents/constants';
import type { HeartbeatToolResponse } from '../heartbeat/prompt';
import type { SessionFile } from './session/store';
import type { AgentExecutionServicePort } from './execution/types';
import type { AgentStartupFilesServicePort, WorkspaceService } from './workspace';
import type { ProviderBuiltInToolSpec } from '../llm/types';

export type Level = 'debug' | 'info' | 'warn' | 'error';

export interface PlanEntry {
	task: string;
	status: 'pending' | 'in_progress' | 'done';
}

export interface FridayServices {
	store: StoreService;
	eventBus: EventBus;
	logger: LoggerService;
	workspace: WorkspaceService;
	cron?: CronService;
	connectors?: ConnectorsService;
	skills?: SkillsService;
}

export type CronToolContext =
	| { role: 'owner'; agentId?: string }
	| { role: 'http'; userId?: string }
	| { role: 'cron-self'; jobId?: string; agentId?: string; sessionKey?: string | null };

export interface ToolContext {
	workspace: string;
	agentId?: string;
	cronContext?: CronToolContext;
	deliveryContext?: Record<string, unknown>;
	sessionId: string;
	sessionBaseDir?: string;
	sessionVisibility?: 'self' | 'tree' | 'agent' | 'all';
	readState: Map<string, { mtimeMs: number; size: number }>;
	plan: { entries: PlanEntry[] };
	signal?: AbortSignal;
	services: FridayServices;
}

export interface AgentToolResult<TDetails = unknown> {
	status: AgentToolResultStatus;
	content: ToolResultBlock[];
	details?: TDetails;
}

export interface AgentTool<TArgs = Record<string, unknown>, TDetails = unknown> {
	name: string;
	displayName?: string;
	displaySummary?: string;
	description: string;
	schema: JSONSchema;
	serviceKind?: AgentCapabilityServiceKind;
	serviceId?: string;
	ownerOnly?: boolean;
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export interface AgentToolSelectionForTurn {
	toolsForPrompt: AgentTool[];
	systemPromptSuffix: string;
	rankedTools: AgentTool[];
}

export interface AgentToolManagementOptions {
	enabled?: boolean;
	maxPromptTools?: number;
	maxToolCallsPerTurn?: number;
	forceSelection?: boolean;
}

export interface ToolRunPreparation extends AgentToolSelectionForTurn {
	management: AgentToolManagementOptions;
}

export interface AgentDataDirectoryServiceOptions {
	appDataPath?: string;
	appDirectoryName?: string;
}

export interface AgentDataDirectoryServicePort {
	getRootPath(): string;
	ensureRoot(): Promise<string>;
	resolve(...segments: string[]): string;
	resolveExisting(...segments: string[]): Promise<string>;
}

export interface AgentSettingsStoreLogger {
	debug(source: string, message: string, data?: unknown): void;
	info(source: string, message: string, data?: unknown): void;
	warn(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

export interface AgentSettingsStoreSchema {
	agents?: AgentConfig[];
	bindings?: AgentRouteBinding[];
}

export interface AgentSettingsStoreAccessor {
	get<TKey extends keyof AgentSettingsStoreSchema>(key: TKey): AgentSettingsStoreSchema[TKey];
	set<TKey extends keyof AgentSettingsStoreSchema>(
		key: TKey,
		value: AgentSettingsStoreSchema[TKey]
	): void;
}

export interface AgentSettingsStoreOptions {
	logger?: AgentSettingsStoreLogger;
	store?: AgentSettingsStoreAccessor;
}

export interface AgentSettingsStorePort {
	getAgentRoutingSettings(): AgentRoutingSettings;
	getConfiguredAgents(): AgentConfig[];
	getAgentConfig(id: string): AgentConfig | undefined;
	setAgentRoutingSettings(settings: unknown): AgentRoutingSettings;
}

export interface AgentServiceDependencies {
	store: StoreService;
	cron: CronService;
	logger: LoggerService;
	eventBus: EventBus;
	workspace: WorkspaceService;
	agentDataDirectory?: AgentDataDirectoryServicePort;
	agentSettings?: AgentSettingsStorePort;
	connectors?: ConnectorsService;
	skills?: SkillsService;
	channels?: Pick<ChannelsService, 'getChannel' | 'getChannelConfig'>;
	channelRegistry?: ChannelRegistry;
	startupFiles?: AgentStartupFilesServicePort;
}

export interface AgentToolsFactoryContext<TServices = unknown> {
	agentId: string;
	runId: string;
	providerId: string;
	model: string;
	workspace: string;
	session: SessionFile;
	signal: AbortSignal;
	services: TServices;
	toolContext: ToolContext;
	toolsAllow?: string[];
	toolsDeny?: string[];
}

export type AgentToolsFactory<TServices = unknown> = (
	context: AgentToolsFactoryContext<TServices>
) => AgentTool[] | Promise<AgentTool[]>;

export interface AgentServiceOptions {
	defaultAgentId?: string;
	providerFactory?: (provider: ProviderSpec) => ProviderAdapter;
	toolsFactory?: AgentToolsFactory<AgentServiceDependencies>;
	toolController?: AgentToolControllerPort;
	capabilityService?: AgentCapabilityServicePort;
	executionService?: AgentExecutionServicePort;
	sessionBaseDir?: string;
}

export interface AgentSendOptions {
	runId?: string;
	cronContext?: CronToolContext;
	sessionId?: string;
	providerId?: string;
	model?: string;
	effort?: ModelReasoningEffort;
	lightContext?: boolean;
	streamEvent?: (event: AgentResponseEvent) => void;
	toolsAllow?: string[];
	toolsDeny?: string[];
	sessionMetadata?: Partial<AgentSessionMetadata>;
	heartbeat?: {
		model?: string;
		timeoutSeconds?: number;
		lightContext?: boolean;
		suppressToolErrorWarnings?: boolean;
		suppressAgentEvents?: boolean;
		enableHeartbeatTool?: boolean;
		forceHeartbeatTool?: boolean;
		onToolResponse?: (response: HeartbeatToolResponse) => void;
	};
}

export interface AgentRunRecord {
	id: string;
	agentId: string;
	sessionId: string;
	state: AgentRunState;
	createdAt: string;
	updatedAt: string;
	providerId?: string;
	model?: string;
	label?: string;
	output?: string;
	error?: string;
}

export interface AgentCreateRunOptions {
	runId?: string;
	agentId?: string;
	sessionId?: string;
	providerId?: string;
	model?: string;
	state?: AgentRunState;
	sessionMetadata?: Partial<AgentSessionMetadata>;
}

export type AgentRunStatePatch = Partial<
	Pick<AgentRunRecord, 'state' | 'label' | 'output' | 'error' | 'providerId' | 'model'>
>;

export type AgentExecuteRunOptions = Omit<AgentSendOptions, 'runId' | 'sessionId'> & {
	deleteWhenDone?: boolean;
};

export interface Runtime {
	session: SessionFile | null;
	currentAbort: AbortController | null;
}

export interface ToolsServicePort {
	createDefaultTools(input: {
		explicitAllow?: string[];
		denylist?: string[];
	}): AgentTool[];
	filterToolsByAllowlist(
		tools: AgentTool[],
		allowlist: string[] | undefined
	): AgentTool[];
	createManagementOptions(options?: AgentToolManagementOptions): AgentToolManagementOptions;
	createStartupFilesTool(
		agentId: string,
		startupFiles: AgentStartupFilesServicePort
	): AgentTool;
	prepareToolsForProvider(
		tools: AgentTool[],
		ctx: ToolContext,
		options?: { provider?: string; modelId?: string }
	): AgentTool[];
	selectToolsForTurn(
		tools: AgentTool[],
		message: string,
		ctx: ToolContext,
		options?: AgentToolManagementOptions
	): AgentToolSelectionForTurn;
	prepareToolsForRun(input: {
		tools: AgentTool[];
		ctx: ToolContext;
		userMessage: string;
		provider?: string;
		modelId?: string;
		management?: AgentToolManagementOptions;
	}): ToolRunPreparation;
	createCallTracker(): unknown;
	beforeCall(
		tool: AgentTool,
		args: unknown,
		ctx: ToolContext,
		tracker: unknown
	): Promise<{
		proceed: boolean;
		warning?: string;
		vetoStatus?: AgentToolResultStatus;
		vetoResult?: AgentToolResult;
		reason?: string;
	}>;
	executeToolWithManagement(
		tool: AgentTool,
		args: Record<string, unknown>,
		ctx: ToolContext,
		management: AgentToolManagementOptions
	): Promise<AgentToolResult>;
}

export interface BuildAgentToolsInput<TServices = unknown> {
	context: AgentToolsFactoryContext<TServices>;
	toolsFactory?: AgentToolsFactory<TServices>;
	additionalTools?: AgentTool[];
}

export interface BuiltAgentTools {
	tools: AgentTool[];
	builtInTools: ProviderBuiltInToolSpec[];
}

export interface SelectAgentToolsInput {
	tools: AgentTool[];
	message: string;
	ctx: ToolContext;
	maxPromptTools: number;
}

export interface PrepareProviderToolsInput {
	tools: AgentTool[];
	ctx: ToolContext;
	providerId: string;
	model: string;
}

export interface PrepareAgentToolRunInput {
	tools: AgentTool[];
	ctx: ToolContext;
	userMessage: string;
	providerId?: string;
	model: string;
	management?: AgentToolManagementOptions;
}

export interface PreparedAgentToolRun extends AgentToolSelectionForTurn {
	management: AgentToolManagementOptions;
	tracker: unknown;
}

export interface ExecuteAgentToolInput {
	tool: AgentTool;
	args: Record<string, unknown>;
	ctx: ToolContext;
	tracker: unknown;
	management: AgentToolManagementOptions;
}

export interface ExecuteAgentToolResult {
	status: AgentToolResultStatus;
	result: AgentToolResult;
}

export interface AgentToolControllerPort {
	buildTools<TServices = unknown>(input: BuildAgentToolsInput<TServices>): Promise<BuiltAgentTools>;
	selectForTurn(input: SelectAgentToolsInput): AgentToolSelectionForTurn;
	prepareForProvider(input: PrepareProviderToolsInput): AgentTool[];
	prepareRun(input: PrepareAgentToolRunInput): PreparedAgentToolRun;
	execute(input: ExecuteAgentToolInput): Promise<ExecuteAgentToolResult>;
	createStartupFilesTool(agentId: string, startupFiles: AgentStartupFilesServicePort): AgentTool;
}

export interface AgentToolControllerOptions {
	logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
	toolService?: ToolsServicePort;
}
