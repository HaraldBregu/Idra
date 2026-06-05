import type { ConnectorsService } from '../connectors';
import type { ProviderBuiltInToolSpec } from '../llm/types';
import { McpService } from '../mcp';
import type { LoggerService } from '../observability';
import type { AgentTool, ToolContext, ToolsServicePort } from './tooling';
import type { SessionFile } from './session/store';

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

export interface CreateAgentToolsInput<TServices = unknown> {
	context: AgentToolsFactoryContext<TServices>;
	toolService: ToolsServicePort;
	toolsFactory?: AgentToolsFactory<TServices>;
	additionalTools?: AgentTool[];
	connectors?: ConnectorsService;
	logger?: Pick<LoggerService, 'info'>;
}

export interface CreatedAgentTools {
	tools: AgentTool[];
	builtInTools: ProviderBuiltInToolSpec[];
}

export async function createAgentTools<TServices = unknown>(
	input: CreateAgentToolsInput<TServices>
): Promise<CreatedAgentTools> {
	const usesDefaultFactory = !input.toolsFactory;
	const toolsFactory =
		input.toolsFactory ??
		((context: AgentToolsFactoryContext<TServices>) =>
			input.toolService.createDefaultTools({
				explicitAllow: context.toolsAllow,
				denylist: context.toolsDeny,
			}));
	let tools = await Promise.resolve(toolsFactory(input.context));
	if (input.additionalTools?.length) {
		tools = [...tools, ...input.additionalTools];
	}
	if (!usesDefaultFactory || input.context.toolsAllow) {
		tools = input.toolService.filterToolsByAllowlist(tools, input.context.toolsAllow);
	}
	const builtInTools =
		input.connectors ? new McpService(input.connectors).createToolsForProvider(input.context.providerId) : [];
	input.logger?.info('AgentTools', 'Resolved provider built-in tools', {
		providerId: input.context.providerId,
		count: builtInTools.length,
	});
	return { tools, builtInTools };
}
