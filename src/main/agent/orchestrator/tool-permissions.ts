import type { AgentConfig, AgentToolPermissionMode } from '../../../shared/store';
import type { AgentTool, ToolServicePort } from '../capabilities/local';
import { shouldExposeStartupFilesTool } from './routing/intent';

export interface AgentAllowedToolsInput {
	message: string;
	capabilityTools: AgentTool[];
	startupTool: AgentTool;
	bootstrapPending: boolean;
	agentConfig?: AgentConfig;
	toolsAllow?: string[];
	toolsDeny?: string[];
	toolService: ToolServicePort;
}

export interface AgentAllowedTools {
	tools: AgentTool[];
	approvalRequired: Set<string>;
}

export function resolveAgentAllowedTools(input: AgentAllowedToolsInput): AgentAllowedTools {
	const configuredTools = applyAgentToolPermissions(
		input.toolService.filterToolsByAllowlist(
			input.toolService.filterToolsByDenylist(input.capabilityTools, input.toolsDeny),
			input.toolsAllow
		),
		input.agentConfig
	);
	const startupToolAllowed = input.bootstrapPending || shouldExposeStartupFilesTool(input.message);
	const tools = input.bootstrapPending
		? [input.startupTool]
		: startupToolAllowed
			? [...configuredTools, input.startupTool]
			: configuredTools;
	return {
		tools,
		approvalRequired: resolveAgentToolApprovals(input.agentConfig, tools),
	};
}

function applyAgentToolPermissions(tools: AgentTool[], config: AgentConfig | undefined): AgentTool[] {
	const permissions = config?.tools?.permissions;
	if (!permissions) return tools;
	return tools.filter((tool) => permissions[tool.name] !== 'deny');
}

function resolveAgentToolApprovals(config: AgentConfig | undefined, tools: AgentTool[]): Set<string> {
	const permissions = config?.tools?.permissions;
	const available = new Set(tools.map((tool) => tool.name));
	return new Set(Object.entries(permissions ?? {}).flatMap(([name, mode]: [string, AgentToolPermissionMode]) =>
		mode === 'ask' && available.has(name) ? [name] : []
	));
}
