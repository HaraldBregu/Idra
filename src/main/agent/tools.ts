import type { ProviderBuiltInToolSpec } from '../llm/types';
import { ToolsService } from '../tools';
import type { LoggerService } from '../observability';
import type {
	AgentTool,
	AgentToolManagementOptions,
	AgentToolResult,
	AgentToolSelectionForTurn,
	ToolRunPreparation,
	ToolContext,
} from './tooling';
import type { AgentToolResultStatus } from '../../shared/agents/events';
import type { SessionFile } from './session/store';
import type { AgentStartupFilesServicePort } from './workspace/startup';

interface ToolsServicePort {
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

export function createAgentToolController(
	options: AgentToolControllerOptions = {}
): AgentToolControllerPort {
	return new AgentToolController(options.toolService ?? new ToolsService(options.logger));
}

class AgentToolController implements AgentToolControllerPort {
	constructor(private readonly toolService: ToolsServicePort) {}

	async buildTools<TServices = unknown>(
		input: BuildAgentToolsInput<TServices>
	): Promise<BuiltAgentTools> {
		const usesDefaultFactory = !input.toolsFactory;
		const toolsFactory =
			input.toolsFactory ??
			((context: AgentToolsFactoryContext<TServices>) =>
				this.toolService.createDefaultTools({
					explicitAllow: context.toolsAllow,
					denylist: context.toolsDeny,
				}));
		let tools = await Promise.resolve(toolsFactory(input.context));
		if (input.additionalTools?.length) {
			tools = [...tools, ...input.additionalTools];
		}
		if (!usesDefaultFactory || input.context.toolsAllow) {
			tools = this.toolService.filterToolsByAllowlist(tools, input.context.toolsAllow);
		}
		return { tools, builtInTools: [] };
	}

	selectForTurn(input: SelectAgentToolsInput): AgentToolSelectionForTurn {
		return this.toolService.selectToolsForTurn(
			input.tools,
			input.message,
			input.ctx,
			this.toolService.createManagementOptions({
				maxPromptTools: input.maxPromptTools,
			})
		);
	}

	prepareForProvider(input: PrepareProviderToolsInput): AgentTool[] {
		return this.toolService.prepareToolsForProvider(input.tools, input.ctx, {
			provider: input.providerId,
			modelId: input.model,
		});
	}

	prepareRun(input: PrepareAgentToolRunInput): PreparedAgentToolRun {
		return {
			...this.toolService.prepareToolsForRun({
				tools: input.tools,
				ctx: input.ctx,
				userMessage: input.userMessage,
				provider: input.providerId,
				modelId: input.model,
				management: input.management,
			}),
			tracker: this.toolService.createCallTracker(),
		};
	}

	async execute(input: ExecuteAgentToolInput): Promise<ExecuteAgentToolResult> {
		const before = await this.toolService.beforeCall(
			input.tool,
			input.args,
			input.ctx,
			input.tracker
		);
		if (!before.proceed && before.vetoResult) {
			return {
				status: before.vetoStatus ?? 'error',
				result: before.vetoResult,
			};
		}

		const result = await this.toolService.executeToolWithManagement(
			input.tool,
			input.args,
			input.ctx,
			input.management
		);
		return {
			status: normalizeToolResultStatus(result.status),
			result: {
				...result,
				content: before.warning
					? [...result.content, { type: 'text' as const, text: before.warning }]
					: result.content,
			},
		};
	}

	createStartupFilesTool(
		agentId: string,
		startupFiles: AgentStartupFilesServicePort
	): AgentTool {
		return this.toolService.createStartupFilesTool(agentId, startupFiles);
	}
}

function normalizeToolResultStatus(status: unknown): AgentToolResultStatus {
	if (status === 'ok') return 'ok';
	if (status === 'blocked') return 'blocked';
	if (status === 'rejected') return 'rejected';
	return 'error';
}
