import type { EventBus } from '../services/event-bus';
import type { CronService } from '../cron';
import type { LoggerService } from '../observability';
import type { StoreService } from '../store';
import type { ConnectorsService } from '../connectors';
import type { SkillsService } from '../skills';
import type { ChannelRegistry, ChannelsService } from '../channels';
import type { AgentCapabilityServicePort } from '../capabilities';
import type { ProviderSpec } from '../llm/router';
import type { ProviderAdapter } from '../llm/types';
import type { AgentRunState, ModelReasoningEffort } from '../../shared/agents/service';
import type { AgentResponseEvent, AgentToolResultStatus } from '../../shared/agents/events';
import type { AgentSessionMetadata } from '../../shared/store';
import type { HeartbeatToolResponse } from '../heartbeat/prompt';
import type { SessionFile } from './session/store';
import type { AgentDataDirectoryServicePort } from './storage';
import type { AgentSettingsStorePort } from './settings';
import type { AgentExecutionServicePort } from './execution/types';
import type { AgentStartupFilesServicePort, WorkspaceService } from './workspace';
import type {
	AgentTool,
	AgentToolManagementOptions,
	AgentToolSelectionForTurn,
	ToolContext,
	ToolRunPreparation,
	CronToolContext,
	AgentToolResult,
} from './tooling';
import type { ProviderBuiltInToolSpec } from '../llm/types';

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
