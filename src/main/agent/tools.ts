import type { ProviderBuiltInToolSpec } from '../llm/types';
import { ToolsService } from '../tools';
import type {
	AgentTool,
	AgentToolSelectionForTurn,
	ToolContext,
} from './tooling';
import type { AgentStartupFilesServicePort } from './workspace/startup';
import type {
	AgentToolControllerOptions,
	AgentToolControllerPort,
	AgentToolsFactoryContext,
	BuildAgentToolsInput,
	BuiltAgentTools,
	ExecuteAgentToolInput,
	ExecuteAgentToolResult,
	PrepareAgentToolRunInput,
	PreparedAgentToolRun,
	PrepareProviderToolsInput,
	SelectAgentToolsInput,
	ToolsServicePort,
} from './types';

export type {
	AgentToolControllerOptions,
	AgentToolControllerPort,
	AgentToolsFactory,
	AgentToolsFactoryContext,
	BuildAgentToolsInput,
	BuiltAgentTools,
	ExecuteAgentToolInput,
	ExecuteAgentToolResult,
	PrepareAgentToolRunInput,
	PreparedAgentToolRun,
	PrepareProviderToolsInput,
	SelectAgentToolsInput,
} from './types';

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
