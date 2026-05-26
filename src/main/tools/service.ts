import {
	PolicyService,
	type PolicyServicePort,
	type ToolPolicySubject,
} from '../policy';
import type { AgentTool, AgentToolResult, ToolContext } from './types';
import { getToolMetadata, normalizeToolName } from './core/common';
import { createTools, localToolCatalogByName } from './catalog/registry';
import {
	executeAgentToolWithManagement,
	selectAgentToolsForTurn,
	ToolExecutor,
	type AgentToolManagementOptions,
	type AgentToolSelectionForTurn,
} from './management';
import {
	beforeToolCall,
	newCallTracker,
	type BeforeCallOutcome,
	type CallTracker,
} from './guard';
import {
	prepareLegacyToolsForProvider,
	type PrepareLegacyToolsForProviderOptions,
} from './runtime/adapt';
import type { ToolProfile } from '../policy';

const defaultPolicyService = new PolicyService();

export type {
	AgentToolManagementOptions,
	AgentToolSelectionForTurn,
} from './management';

export interface ToolRunPreparation extends AgentToolSelectionForTurn {
	management: AgentToolManagementOptions;
}

export interface DefaultToolPolicy {
	profile?: ToolProfile;
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
}

export interface ToolServicePort {
	getToolRegistry(): ReturnType<typeof localToolCatalogByName>;
	getToolsByGroup(group: string): AgentTool[];
	createDefaultTools(input: {
		toolPolicy?: DefaultToolPolicy;
		denylist?: string[];
	}): AgentTool[];
	filterToolsByAllowlist(
		tools: AgentTool[],
		allowlist: string[] | undefined,
		policy?: PolicyServicePort
	): AgentTool[];
	filterToolsByDenylist(
		tools: AgentTool[],
		denylist: string[] | undefined,
		policy?: PolicyServicePort
	): AgentTool[];
	createCallTracker(): CallTracker;
	createManagementOptions(options?: AgentToolManagementOptions): AgentToolManagementOptions;
	prepareToolsForProvider(
		tools: AgentTool[],
		ctx: ToolContext,
		options?: PrepareLegacyToolsForProviderOptions
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
	beforeCall(
		tool: AgentTool,
		args: unknown,
		ctx: ToolContext,
		tracker: CallTracker
	): Promise<BeforeCallOutcome>;
	executeToolWithManagement(
		tool: AgentTool,
		args: Record<string, unknown>,
		ctx: ToolContext,
		management: AgentToolManagementOptions
	): Promise<AgentToolResult>;
}

export class ToolService implements ToolServicePort {
	getToolRegistry(): ReturnType<typeof localToolCatalogByName> {
		return localToolCatalogByName();
	}

	getToolsByGroup(group: string): AgentTool[] {
		return [...this.getToolRegistry().values()]
			.filter((entry) => entry.group === group)
			.map((entry) => entry.tool as AgentTool);
	}

	createDefaultTools(input: {
		toolPolicy?: DefaultToolPolicy;
		denylist?: string[];
	}): AgentTool[] {
		const policy = input.toolPolicy;
		return createTools({
			profile: policy?.profile ?? 'standard',
			allow: policy?.allow ?? [],
			alsoAllow: policy?.alsoAllow,
			deny: [...(policy?.deny ?? []), ...(input.denylist ?? [])],
			fs: policy?.fs,
		});
	}

	filterToolsByAllowlist(
		tools: AgentTool[],
		allowlist: string[] | undefined,
		policy?: PolicyServicePort
	): AgentTool[] {
		if (!allowlist) return tools;
		return filterTools(tools, { allow: allowlist }, policy);
	}

	filterToolsByDenylist(
		tools: AgentTool[],
		denylist: string[] | undefined,
		policy?: PolicyServicePort
	): AgentTool[] {
		if (!denylist?.length) return tools;
		return filterTools(tools, { deny: denylist }, policy);
	}

	createCallTracker(): CallTracker {
		return newCallTracker();
	}

	createManagementOptions(options?: AgentToolManagementOptions): AgentToolManagementOptions {
		return {
			...options,
			executor:
				options?.executor ??
				new ToolExecutor({ maxToolCallsPerTurn: options?.maxToolCallsPerTurn }),
		};
	}

	prepareToolsForProvider(
		tools: AgentTool[],
		ctx: ToolContext,
		options: PrepareLegacyToolsForProviderOptions = {}
	): AgentTool[] {
		return prepareLegacyToolsForProvider(tools, ctx, options);
	}

	selectToolsForTurn(
		tools: AgentTool[],
		message: string,
		ctx: ToolContext,
		options?: AgentToolManagementOptions
	): AgentToolSelectionForTurn {
		const selection = selectAgentToolsForTurn(tools, message, ctx, options);
		if (!options?.forceSelection || selection.systemPromptSuffix || selection.toolsForPrompt.length === 0) {
			return selection;
		}
		return {
			...selection,
			systemPromptSuffix: renderSelectedToolPrompt(selection.toolsForPrompt),
		};
	}

	prepareToolsForRun(input: {
		tools: AgentTool[];
		ctx: ToolContext;
		userMessage: string;
		provider?: string;
		modelId?: string;
		management?: AgentToolManagementOptions;
	}): ToolRunPreparation {
		const management = this.createManagementOptions(input.management);
		const providerTools = this.prepareToolsForProvider(input.tools, input.ctx, {
			provider: input.provider,
			modelId: input.modelId,
		});
		return {
			...this.selectToolsForTurn(providerTools, input.userMessage, input.ctx, management),
			management,
		};
	}

	beforeCall(
		tool: AgentTool,
		args: unknown,
		ctx: ToolContext,
		tracker: CallTracker
	): Promise<BeforeCallOutcome> {
		return beforeToolCall(tool, args, ctx, tracker);
	}

	executeToolWithManagement(
		tool: AgentTool,
		args: Record<string, unknown>,
		ctx: ToolContext,
		management: AgentToolManagementOptions
	): Promise<AgentToolResult> {
		return executeAgentToolWithManagement(tool, args, ctx, management);
	}
}

function filterTools(
	tools: AgentTool[],
	runtime: { allow?: string[]; deny?: string[] },
	policy?: PolicyServicePort
): AgentTool[] {
	const catalog = localToolCatalogByName();
	const subjects: ToolPolicySubject[] = tools.map((tool) => {
		const metadata = getToolMetadata(tool as never);
		const entry = catalog.get(tool.name);
		return {
			name: tool.name,
			ownerOnly: tool.ownerOnly,
			optional: metadata?.optional,
			ownerKind: metadata?.ownerKind,
			pluginId: metadata?.pluginId,
			groups: entry ? [`group:${entry.group}`] : undefined,
		};
	});
	const policyService = policy ?? defaultPolicyService;
	const result = policyService.evaluateTools(subjects, {
		stages: { runtime },
	});
	return tools.filter((tool) => result.allowed.has(normalizeToolName(tool.name)));
}

function renderSelectedToolPrompt(tools: AgentTool[]): string {
	return [
		'Available tools for this turn only:',
		...tools.map((tool) => [`Tool: ${tool.name}`, `Description: ${tool.description}`].join('\n')),
	].join('\n');
}
