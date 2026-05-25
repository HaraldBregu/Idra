import type { AgentTool, ToolDiagnostics } from '../core/common';
import {
	assertUniqueToolNames,
	createToolDiagnostics,
	getToolMetadata,
	markClientTool,
	normalizeToolName,
} from '../core/common';
import { createReadTool } from '../files/read-tool';
import { createExecTool } from '../execution/exec-tool';
import { normalizeToolSchemas } from '../core/schema-normalization';
import { applyToolPolicyPipeline, type PolicyStageName } from '../policy/tool-policy-pipeline';
import {
	wrapToolWithBeforeToolCall,
	type BeforeToolCallContext,
	newCallTracker,
} from '../policy/before-tool-call';
import { applyToolSearchCompaction, type ToolSearchCompactionOptions } from './tool-search';
import { materializeMcpTools, type McpRuntime } from '../external/mcp-tools';
import { materializeLspTools, type LspRuntime } from '../external/lsp-tools';
import type {
	AppConfig,
	AuthContext,
	DeliveryContext,
	PluginToolContext,
} from '../../plugins/tool-types';
import type { PluginToolRegistry } from '../../plugins/tool-registry';
import type { ToolPolicy } from '../policy/tool-policy';

export type SandboxContext = {
	sandboxed?: boolean;
	allowShell?: boolean;
	readOnly?: boolean;
	policy?: ToolPolicy;
};

export type CreateAgentToolsOptions = {
	config?: AppConfig & {
		toolPolicies?: Partial<Record<PolicyStageName, ToolPolicy | undefined>>;
		toolSearch?: ToolSearchCompactionOptions;
		tools?: {
			fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
			exec?: Record<string, unknown>;
		};
	};
	agentId?: string;
	sessionId?: string;
	runId?: string;
	workspaceDir: string;
	provider?: string;
	modelId?: string;
	modelCapabilities?: string[];
	sender?: {
		id?: string;
		isOwner?: boolean;
		channel?: string;
		groupId?: string;
	};
	sandbox?: SandboxContext;
	auth?: AuthContext;
	delivery?: DeliveryContext;
	abortSignal?: AbortSignal;
	toolsAllow?: string[];
	toolsDeny?: string[];
	includeCoreTools?: boolean;
	hostTools?: AgentTool[];
	pluginRegistry?: PluginToolRegistry;
	mcpRuntime?: McpRuntime;
	lspRuntime?: LspRuntime;
	clientTools?: AgentTool[];
	beforeToolCall?: Omit<BeforeToolCallContext, 'signal' | 'loopDetector'>;
};

export type ToolConstructionPlan = {
	includeFileTools: boolean;
	includeShellTools: boolean;
	includeWebTools: boolean;
	includeMessagingTools: boolean;
	includePluginTools: boolean;
	includeMcpTools: boolean;
	includeLspTools: boolean;
	includeToolSearchControls: boolean;
};

export type CreateAgentToolsResult = {
	tools: AgentTool[];
	candidates: AgentTool[];
	plan: ToolConstructionPlan;
	diagnostics: ToolDiagnostics;
	dispose: () => Promise<void>;
};

const CORE_TOOL_FAMILIES: Record<string, keyof ToolConstructionPlan> = {
	read: 'includeFileTools',
	write: 'includeFileTools',
	edit: 'includeFileTools',
	apply_patch: 'includeFileTools',
	delete: 'includeFileTools',
	copy: 'includeFileTools',
	move: 'includeFileTools',
	inspect_file: 'includeFileTools',
	find: 'includeFileTools',
	exec: 'includeShellTools',
	process: 'includeShellTools',
	web_fetch: 'includeWebTools',
	web_search: 'includeWebTools',
	message: 'includeMessagingTools',
};

export function planToolConstruction(toolsAllow?: string[]): ToolConstructionPlan {
	const empty: ToolConstructionPlan = {
		includeFileTools: false,
		includeShellTools: false,
		includeWebTools: false,
		includeMessagingTools: false,
		includePluginTools: false,
		includeMcpTools: false,
		includeLspTools: false,
		includeToolSearchControls: false,
	};
	if (toolsAllow !== undefined && toolsAllow.length === 0) return empty;
	if (toolsAllow === undefined) {
		return {
			...empty,
			includeFileTools: true,
			includeShellTools: true,
			includePluginTools: true,
			includeToolSearchControls: true,
		};
	}
	const normalized = toolsAllow.map(normalizeToolName);
	if (normalized.includes('*')) {
		return Object.fromEntries(Object.keys(empty).map((key) => [key, true])) as ToolConstructionPlan;
	}
	const plan = { ...empty };
	for (const name of normalized) {
		if (name === 'group:mcp' || name.startsWith('mcp_')) plan.includeMcpTools = true;
		else if (name === 'group:lsp' || name.startsWith('lsp_')) plan.includeLspTools = true;
		else if (name === 'group:plugins' || name.startsWith('plugin:')) plan.includePluginTools = true;
		else if (name.startsWith('group:file')) plan.includeFileTools = true;
		else if (name.startsWith('group:shell')) plan.includeShellTools = true;
		else if (name.startsWith('group:web')) plan.includeWebTools = true;
		else if (name.startsWith('group:messaging')) plan.includeMessagingTools = true;
		else if (name.startsWith('group:session') || name.startsWith('group:planning')) continue;
		else {
			const family = CORE_TOOL_FAMILIES[name];
			if (family) plan[family] = true;
			else plan.includePluginTools = true;
		}
	}
	plan.includeToolSearchControls =
		normalized.includes('tool_search') ||
		normalized.includes('tool_call') ||
		normalized.includes('tool_describe');
	return plan;
}

export async function createAgentTools(
	options: CreateAgentToolsOptions
): Promise<CreateAgentToolsResult> {
	const diagnostics = createToolDiagnostics();
	const plan = planToolConstruction(options.toolsAllow);
	const candidates = await buildToolCandidates(options, plan, diagnostics);
	const policy = applyToolPolicyPipeline(candidates, {
		sender: options.sender,
		stages: buildPolicyStages(options),
		diagnostics,
	});
	const tools = prepareRuntimeTools(policy.tools, options, plan, diagnostics);

	return {
		tools,
		candidates,
		plan,
		diagnostics,
		async dispose() {
			await options.lspRuntime?.dispose?.();
			diagnostics.emit({ type: 'tool.runtime.disposed', details: { runId: options.runId } });
		},
	};
}

async function buildToolCandidates(
	options: CreateAgentToolsOptions,
	plan: ToolConstructionPlan,
	diagnostics: ToolDiagnostics
): Promise<AgentTool[]> {
	const candidates: AgentTool[] = [];

	if (options.includeCoreTools !== false) {
		addCoreToolCandidates(candidates, options, plan, diagnostics);
	}
	addHostToolCandidates(candidates, options);
	await addPluginToolCandidates(candidates, options, plan, diagnostics);
	await addMcpToolCandidates(candidates, options, plan, diagnostics);
	await addLspToolCandidates(candidates, options, plan);
	addClientToolCandidates(candidates, options);

	assertUniqueToolNames(candidates);
	diagnostics.builtTools.push(...candidates.map((tool) => tool.name));

	return candidates;
}

function addCoreToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions,
	plan: ToolConstructionPlan,
	diagnostics: ToolDiagnostics
): void {
	const fsPolicy = options.config?.tools?.fs;
	if (plan.includeFileTools) {
		candidates.push(
			createReadTool({
				workspaceDir: options.workspaceDir,
				allowAbsolutePaths: fsPolicy?.workspaceOnly === false,
			})
		);
	}
	if (plan.includeShellTools && options.sandbox?.allowShell !== false) {
		candidates.push(createExecTool({ workspaceDir: options.workspaceDir }));
	}
	if (plan.includeShellTools && options.sandbox?.allowShell === false) {
		diagnostics.filteredTools.push({
			toolName: 'exec',
			stage: 'construction',
			reason: 'sandbox disallows shell tools',
		});
	}
}

function addHostToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions
): void {
	candidates.push(...(options.hostTools ?? []));
}

async function addPluginToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions,
	plan: ToolConstructionPlan,
	diagnostics: ToolDiagnostics
): Promise<void> {
	if (!plan.includePluginTools || !options.pluginRegistry) return;
	candidates.push(
		...(await options.pluginRegistry.resolveTools({
			context: pluginContext(options),
			toolsAllow: options.toolsAllow,
			toolsDeny: options.toolsDeny,
			existingToolNames: candidateNames(candidates),
			diagnostics,
		}))
	);
}

async function addMcpToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions,
	plan: ToolConstructionPlan,
	diagnostics: ToolDiagnostics
): Promise<void> {
	if (!plan.includeMcpTools) return;
	candidates.push(
		...(await materializeMcpTools({
			runtime: options.mcpRuntime,
			context: {
				sessionId: options.sessionId,
				runId: options.runId,
				workspaceDir: options.workspaceDir,
			},
			existingToolNames: candidateNames(candidates),
			diagnostics,
		}))
	);
}

async function addLspToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions,
	plan: ToolConstructionPlan
): Promise<void> {
	if (!plan.includeLspTools) return;
	candidates.push(...(await materializeLspTools({ runtime: options.lspRuntime })));
}

function addClientToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions
): void {
	for (const clientTool of options.clientTools ?? []) {
		candidates.push(markClientTool(clientTool, options.sender?.channel));
	}
}

function candidateNames(candidates: AgentTool[]): Set<string> {
	return new Set(candidates.map((tool) => normalizeToolName(tool.name)));
}

function buildPolicyStages(
	options: CreateAgentToolsOptions
): Partial<Record<PolicyStageName, ToolPolicy | undefined>> {
	const fsPolicy = options.config?.tools?.fs;
	const runtimeAllow =
		options.toolsAllow ?? (hasToolControlsWithoutGrants(options.config) ? [] : undefined);
	return {
		...(options.config?.toolPolicies ?? {}),
		sandbox: mergeToolPolicy(
			options.config?.toolPolicies?.sandbox,
			readOnlyPolicy(options.sandbox?.readOnly || fsPolicy?.readOnly),
			options.sandbox?.policy
		),
		runtime: { allow: runtimeAllow, deny: options.toolsDeny },
	};
}

function prepareRuntimeTools(
	tools: AgentTool[],
	options: CreateAgentToolsOptions,
	plan: ToolConstructionPlan,
	diagnostics: ToolDiagnostics
): AgentTool[] {
	let effective = normalizeToolSchemas(tools, {
		provider: options.provider,
		modelId: options.modelId,
		diagnostics,
	});

	const tracker = newCallTracker();
	effective = effective.map((tool) =>
		wrapToolWithBeforeToolCall(tool, {
			...options.beforeToolCall,
			signal: options.abortSignal,
			loopDetector: tracker,
			diagnostics,
		})
	);

	const searchOptions = options.config?.toolSearch;
	if (
		searchOptions?.enabled ||
		(plan.includeToolSearchControls && searchOptions?.enabled !== false)
	) {
		effective = applyToolSearchCompaction(effective, searchOptions).tools;
	}

	return effective;
}

function readOnlyPolicy(readOnly: boolean | undefined): ToolPolicy | undefined {
	return readOnly
		? { deny: ['write', 'edit', 'apply_patch', 'delete', 'copy', 'move'] }
		: undefined;
}

function mergeToolPolicy(...policies: Array<ToolPolicy | undefined>): ToolPolicy | undefined {
	const present = policies.filter((policy): policy is ToolPolicy => policy !== undefined);
	if (present.length === 0) return undefined;
	return {
		profile: present[present.length - 1]?.profile,
		allow: mergeList(present.map((policy) => policy.allow)),
		alsoAllow: mergeList(present.map((policy) => policy.alsoAllow)),
		deny: mergeList(present.map((policy) => policy.deny)),
		fs: Object.assign({}, ...present.map((policy) => policy.fs ?? {})),
		exec: Object.assign({}, ...present.map((policy) => policy.exec ?? {})),
	};
}

function mergeList(values: Array<string[] | undefined>): string[] | undefined {
	const present = values.filter((value): value is string[] => value !== undefined);
	return present.length > 0 ? present.flat() : undefined;
}

function hasToolControlsWithoutGrants(
	config: CreateAgentToolsOptions['config'] | undefined
): boolean {
	if (!config?.tools) return false;
	const policies = Object.values(config.toolPolicies ?? {});
	return !policies.some((policy) => {
		if (!policy) return false;
		return Boolean(policy.profile || policy.allow !== undefined || policy.alsoAllow !== undefined);
	});
}

function pluginContext(options: CreateAgentToolsOptions): PluginToolContext {
	return {
		config: options.config,
		runtimeConfig: options.config,
		getRuntimeConfig: () => options.config,
		workspaceDir: options.workspaceDir,
		agentId: options.agentId,
		sessionId: options.sessionId,
		runId: options.runId,
		provider: options.provider,
		modelId: options.modelId,
		auth: options.auth,
		delivery: options.delivery,
		sender: options.sender,
		sandboxed: options.sandbox?.sandboxed,
	};
}

export function clientToolNames(tools: AgentTool[]): string[] {
	return tools.filter((tool) => getToolMetadata(tool)?.clientHosted).map((tool) => tool.name);
}
