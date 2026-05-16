import type { AgentTool, ToolDiagnostics } from './common';
import {
	assertUniqueToolNames,
	createToolDiagnostics,
	getToolMetadata,
	markClientTool,
	normalizeToolName,
} from './common';
import { createReadTool } from './builtins/read-tool';
import { createExecTool } from './builtins/exec-tool';
import { createUpdatePlanTool, type PlanEntry } from './builtins/update-plan-tool';
import { normalizeToolSchemas } from './schema-normalization';
import { applyToolPolicyPipeline, type PolicyStageName } from './tool-policy-pipeline';
import { wrapToolWithBeforeToolCall, type BeforeToolCallContext, newCallTracker } from './before-tool-call';
import { applyToolSearchCompaction, type ToolSearchCompactionOptions } from './tool-search';
import { materializeMcpTools, type McpRuntime } from './external/mcp-tools';
import { materializeLspTools, type LspRuntime } from './external/lsp-tools';
import type { AppConfig, AuthContext, DeliveryContext, PluginToolContext } from '../plugins/tool-types';
import type { PluginToolRegistry } from '../plugins/tool-registry';
import type { ToolPolicy } from './tool-policy';

export type SandboxContext = {
	sandboxed?: boolean;
	allowShell?: boolean;
	policy?: ToolPolicy;
};

export type CreateAgentToolsOptions = {
	config?: AppConfig & {
		toolPolicies?: Partial<Record<PolicyStageName, ToolPolicy | undefined>>;
		toolSearch?: ToolSearchCompactionOptions;
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
	pluginRegistry?: PluginToolRegistry;
	mcpRuntime?: McpRuntime;
	lspRuntime?: LspRuntime;
	clientTools?: AgentTool[];
	onUpdatePlan?: (plan: PlanEntry[], explanation?: string) => void | Promise<void>;
	beforeToolCall?: Omit<BeforeToolCallContext, 'signal' | 'loopDetector'>;
};

export type ToolConstructionPlan = {
	includeFileTools: boolean;
	includeShellTools: boolean;
	includeWebTools: boolean;
	includeMessagingTools: boolean;
	includeSessionTools: boolean;
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
	find: 'includeFileTools',
	exec: 'includeShellTools',
	process: 'includeShellTools',
	web_fetch: 'includeWebTools',
	web_search: 'includeWebTools',
	message: 'includeMessagingTools',
	ask_human: 'includeMessagingTools',
	update_plan: 'includeSessionTools',
};

export function planToolConstruction(toolsAllow?: string[]): ToolConstructionPlan {
	const empty: ToolConstructionPlan = {
		includeFileTools: false,
		includeShellTools: false,
		includeWebTools: false,
		includeMessagingTools: false,
		includeSessionTools: false,
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
			includeSessionTools: true,
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
		else if (name.startsWith('group:session') || name.startsWith('group:planning')) plan.includeSessionTools = true;
		else {
			const family = CORE_TOOL_FAMILIES[name];
			if (family) plan[family] = true;
			else plan.includePluginTools = true;
		}
	}
	plan.includeToolSearchControls = normalized.includes('tool_search') || normalized.includes('tool_call') || normalized.includes('tool_describe');
	return plan;
}

export async function createAgentTools(options: CreateAgentToolsOptions): Promise<CreateAgentToolsResult> {
	const diagnostics = createToolDiagnostics();
	const plan = planToolConstruction(options.toolsAllow);
	const candidates: AgentTool[] = [];

	if (plan.includeFileTools) candidates.push(createReadTool({ workspaceDir: options.workspaceDir }));
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
	if (plan.includeSessionTools) {
		candidates.push(createUpdatePlanTool({ onUpdatePlan: options.onUpdatePlan }));
	}

	const existingNames = new Set(candidates.map((tool) => normalizeToolName(tool.name)));
	if (plan.includePluginTools && options.pluginRegistry) {
		candidates.push(
			...(await options.pluginRegistry.resolveTools({
				context: pluginContext(options),
				toolsAllow: options.toolsAllow,
				toolsDeny: options.toolsDeny,
				existingToolNames: existingNames,
				diagnostics,
			}))
		);
	}

	if (plan.includeMcpTools) {
		candidates.push(
			...(await materializeMcpTools({
				runtime: options.mcpRuntime,
				context: {
					sessionId: options.sessionId,
					runId: options.runId,
					workspaceDir: options.workspaceDir,
				},
				existingToolNames: new Set(candidates.map((tool) => normalizeToolName(tool.name))),
				diagnostics,
			}))
		);
	}

	if (plan.includeLspTools) candidates.push(...(await materializeLspTools({ runtime: options.lspRuntime })));

	for (const clientTool of options.clientTools ?? []) {
		candidates.push(markClientTool(clientTool, options.sender?.channel));
	}

	assertUniqueToolNames(candidates);
	diagnostics.builtTools.push(...candidates.map((tool) => tool.name));

	const stages: Partial<Record<PolicyStageName, ToolPolicy | undefined>> = {
		...(options.config?.toolPolicies ?? {}),
		sandbox: options.sandbox?.policy ?? options.config?.toolPolicies?.sandbox,
		runtime: { allow: options.toolsAllow, deny: options.toolsDeny },
	};
	const policy = applyToolPolicyPipeline(candidates, {
		sender: options.sender,
		stages,
		diagnostics,
	});
	let effective = normalizeToolSchemas(policy.tools, {
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
	if (searchOptions?.enabled || (plan.includeToolSearchControls && searchOptions?.enabled !== false)) {
		effective = applyToolSearchCompaction(effective, searchOptions).tools;
	}

	return {
		tools: effective,
		candidates,
		plan,
		diagnostics,
		async dispose() {
			await options.lspRuntime?.dispose?.();
			diagnostics.emit({ type: 'tool.runtime.disposed', details: { runId: options.runId } });
		},
	};
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
	return tools
		.filter((tool) => getToolMetadata(tool)?.clientHosted)
		.map((tool) => tool.name);
}

