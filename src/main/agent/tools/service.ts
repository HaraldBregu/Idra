import {
	PolicyService,
	type PolicyServicePort,
	type ToolPolicySubject,
} from '../policy';
import type { CronService } from '../../cron';
import type { LoggerService } from '../../logger';
import type { AgentTool, AgentToolResult, ToolContext } from './core/types';
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
const TOOL_SERVICE_LOG_SOURCE = 'ToolService';

export type {
	AgentToolManagementOptions,
	AgentToolSelectionForTurn,
} from './management';

export interface ToolServiceOptions {
	policy?: PolicyServicePort;
	cron?: CronService;
	logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
}

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
	private readonly policy: NonNullable<ToolServiceOptions['policy']>;
	private readonly cron?: CronService;
	private readonly logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;

	constructor(options: ToolServiceOptions = {}) {
		this.policy = options.policy ?? defaultPolicyService;
		this.cron = options.cron;
		this.logger = options.logger;
		this.logger?.info(TOOL_SERVICE_LOG_SOURCE, 'Initialized tools service');
	}

	getToolRegistry(): ReturnType<typeof localToolCatalogByName> {
		return localToolCatalogByName();
	}

	getToolsByGroup(group: string): AgentTool[] {
		const tools = [...this.getToolRegistry().values()]
			.filter((entry) => entry.group === group)
			.map((entry) => entry.tool as AgentTool);
		this.logger?.info(TOOL_SERVICE_LOG_SOURCE, `Resolved tool group ${group}`, {
			group,
			count: tools.length,
		});
		return tools;
	}

	createDefaultTools(input: {
		toolPolicy?: DefaultToolPolicy;
		denylist?: string[];
	}): AgentTool[] {
		const policy = input.toolPolicy;
		const tools = createTools({
			profile: policy?.profile ?? 'standard',
			allow: policy?.allow ?? [],
			alsoAllow: policy?.alsoAllow,
			deny: [...(policy?.deny ?? []), ...(input.denylist ?? [])],
			fs: policy?.fs,
		}, this.policy);
		this.logger?.info(TOOL_SERVICE_LOG_SOURCE, 'Created default tools', {
			count: tools.length,
			profile: policy?.profile ?? 'standard',
			denyCount: (policy?.deny?.length ?? 0) + (input.denylist?.length ?? 0),
		});
		return tools;
	}

	filterToolsByAllowlist(
		tools: AgentTool[],
		allowlist: string[] | undefined,
		policy?: PolicyServicePort
	): AgentTool[] {
		if (!allowlist) return tools;
		const filtered = filterTools(tools, { allow: allowlist }, policy ?? this.policy);
		this.logger?.info(TOOL_SERVICE_LOG_SOURCE, 'Applied tool allowlist', {
			before: tools.length,
			after: filtered.length,
			allowlist,
		});
		return filtered;
	}

	filterToolsByDenylist(
		tools: AgentTool[],
		denylist: string[] | undefined,
		policy?: PolicyServicePort
	): AgentTool[] {
		if (!denylist?.length) return tools;
		const filtered = filterTools(tools, { deny: denylist }, policy ?? this.policy);
		this.logger?.info(TOOL_SERVICE_LOG_SOURCE, 'Applied tool denylist', {
			before: tools.length,
			after: filtered.length,
			denylist,
		});
		return filtered;
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
		const selection = selectAgentToolsForTurn(tools, message, this.contextWithServiceBoundary(ctx), options);
		this.logger?.info(TOOL_SERVICE_LOG_SOURCE, 'Selected tools for turn', {
			candidates: tools.length,
			selected: selection.toolsForPrompt.length,
			ranked: selection.rankedTools.length,
		});
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
		const selection = this.selectToolsForTurn(providerTools, input.userMessage, input.ctx, management);
		if (selection.toolsForPrompt.length > 0 || providerTools.length !== 1) {
			return {
				...selection,
				management,
			};
		}
		return {
			toolsForPrompt: providerTools,
			systemPromptSuffix: '',
			rankedTools: providerTools,
			management,
		};
	}

	beforeCall(
		tool: AgentTool,
		args: unknown,
		ctx: ToolContext,
		tracker: CallTracker
	): Promise<BeforeCallOutcome> {
		return beforeToolCall(tool, args, this.contextWithServiceBoundary(ctx), tracker)
			.then((outcome) => {
				if (!outcome.proceed) {
					this.logger?.warn(TOOL_SERVICE_LOG_SOURCE, `Tool call blocked: ${tool.name}`, {
						tool: tool.name,
						status: outcome.vetoStatus,
					});
				} else if (outcome.warning) {
					this.logger?.warn(TOOL_SERVICE_LOG_SOURCE, `Tool call warning: ${tool.name}`, {
						tool: tool.name,
						warning: outcome.warning,
					});
				} else {
					this.logger?.info(TOOL_SERVICE_LOG_SOURCE, `Tool call allowed: ${tool.name}`, {
						tool: tool.name,
					});
				}
				return outcome;
			})
			.catch((error) => {
				this.logger?.error(TOOL_SERVICE_LOG_SOURCE, `Tool preflight failed: ${tool.name}`, {
					tool: tool.name,
					error: error instanceof Error ? error.message : String(error),
				});
				throw error;
			});
	}

	executeToolWithManagement(
		tool: AgentTool,
		args: Record<string, unknown>,
		ctx: ToolContext,
		management: AgentToolManagementOptions
	): Promise<AgentToolResult> {
		const startedAt = Date.now();
		const nextCtx = this.contextWithServiceBoundary(ctx);
		this.logger?.info(TOOL_SERVICE_LOG_SOURCE, `Executing tool: ${tool.name}`, {
			tool: tool.name,
		});
		return executeAgentToolWithManagement(tool, args, nextCtx, management)
			.then((result) => {
				const level = result.status === 'ok' ? 'info' : 'warn';
				this.logger?.[level](TOOL_SERVICE_LOG_SOURCE, `Tool execution completed: ${tool.name}`, {
					tool: tool.name,
					status: result.status,
					durationMs: Date.now() - startedAt,
				});
				return result;
			})
			.catch((error) => {
				this.logger?.error(TOOL_SERVICE_LOG_SOURCE, `Tool execution failed: ${tool.name}`, {
					tool: tool.name,
					durationMs: Date.now() - startedAt,
					error: error instanceof Error ? error.message : String(error),
				});
				throw error;
			});
	}

	private contextWithServiceBoundary(ctx: ToolContext): ToolContext {
		const services = {
			...ctx.services,
			policy: ctx.services.policy ?? this.policy,
			cron: ctx.services.cron ?? this.cron,
		};
		if (services === ctx.services) return ctx;
		return { ...ctx, services };
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
