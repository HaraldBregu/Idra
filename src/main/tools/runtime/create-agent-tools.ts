import type { AgentTool, ToolDiagnostics } from '../core/common';
import {
	assertUniqueToolNames,
	createToolDiagnostics,
	normalizeToolName,
} from '../core/common';
import { createReadTool } from '../files/read-tool';
import { normalizeToolSchemas } from '../core/schema-normalization';
import { applyToolPolicyPipeline, type PolicyStageName } from '../policy/tool-policy-pipeline';
import {
	wrapToolWithBeforeToolCall,
	type BeforeToolCallContext,
	newCallTracker,
} from '../policy/before-tool-call';
import type { ToolSearchCompactionOptions } from '../search/tool-search';
import type { McpRuntime } from '../external/mcp-tools';
import type { LspRuntime } from '../external/lsp-tools';
import type { AppConfig, AuthContext, DeliveryContext } from '../../plugins/tool-types';
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
};

const FILE_TOOL_NAMES = new Set(Object.keys(CORE_TOOL_FAMILIES));

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
		};
	}
	const normalized = toolsAllow.map(normalizeToolName);
	if (normalized.includes('*')) {
		return { ...empty, includeFileTools: true };
	}
	const plan = { ...empty };
	for (const name of normalized) {
		if (name.startsWith('group:file')) plan.includeFileTools = true;
		else if (!name.startsWith('group:')) {
			const family = CORE_TOOL_FAMILIES[name];
			if (family) plan[family] = true;
		}
	}
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
		addCoreToolCandidates(candidates, options, plan);
	}
	addHostToolCandidates(candidates, options);

	assertUniqueToolNames(candidates);
	diagnostics.builtTools.push(...candidates.map((tool) => tool.name));

	return candidates;
}

function addCoreToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions,
	plan: ToolConstructionPlan
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
}

function addHostToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions
): void {
	candidates.push(
		...(options.hostTools ?? []).filter((tool) => FILE_TOOL_NAMES.has(normalizeToolName(tool.name)))
	);
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
	if (searchOptions?.enabled) {
		diagnostics.warnings.push('tool search controls are disabled; only file tools are available.');
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

export function clientToolNames(tools: AgentTool[]): string[] {
	return tools.filter((tool) => FILE_TOOL_NAMES.has(normalizeToolName(tool.name))).map((tool) => tool.name);
}
