import type { AgentTool, ToolDiagnostics } from '../core/common';
import type { FridayServices } from '../core/types';
import {
	assertUniqueToolNames,
	createToolDiagnostics,
	normalizeToolName,
} from '../core/common';
import { createFileTools } from '../files/runtime';
import { createCronTools } from '../cron/runtime';
import { createScriptTools } from '../scripts/runtime';
import { normalizeToolSchemas } from '../core/normalize';
import type { ToolAccessRule, ToolAccessStageName } from '../access';
import { applyToolPolicyPipeline } from '../pipeline';
import {
	wrapToolWithBeforeToolCall,
	type BeforeToolCallContext,
	newCallTracker,
} from '../wrap';
import {
	AGENT_TOOL_LEGACY_ALIASES,
	AGENT_TOOL_GROUPS,
	AGENT_TOOL_NAMES,
	AGENT_TOOL_READ_ONLY_DENY_NAMES,
} from '../../../../shared/tools';

type AppConfig = Record<string, unknown>;
type AuthContext = Record<string, unknown>;
type DeliveryContext = Record<string, unknown>;

type PolicyStageName = ToolAccessStageName;

export type SandboxContext = {
	sandboxed?: boolean;
	readOnly?: boolean;
	policy?: ToolAccessRule;
};

export type CreateAgentToolsOptions = {
	config?: AppConfig & {
		toolPolicies?: Partial<Record<PolicyStageName, ToolAccessRule | undefined>>;
		tools?: {
			fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
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
	services?: Partial<FridayServices>;
	beforeToolCall?: Omit<BeforeToolCallContext, 'signal' | 'loopDetector'>;
};

export type ToolConstructionPlan = {
	includeFileTools: boolean;
	includeCronTools: boolean;
	includeShellTools: boolean;
	includeWebTools: boolean;
	includeMessagingTools: boolean;
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

const CORE_TOOL_FAMILIES: Record<string, keyof ToolConstructionPlan> = Object.fromEntries(
	[...AGENT_TOOL_NAMES, ...Object.keys(AGENT_TOOL_LEGACY_ALIASES)].map((name) => [
		name,
		'includeFileTools',
	])
) as Record<string, keyof ToolConstructionPlan>;
for (const tool of AGENT_TOOL_GROUPS.script) {
	CORE_TOOL_FAMILIES[tool.name] = 'includeShellTools';
}
for (const tool of AGENT_TOOL_GROUPS.cron) {
	CORE_TOOL_FAMILIES[tool.name] = 'includeCronTools';
}

const FILE_TOOL_NAMES = new Set(Object.keys(CORE_TOOL_FAMILIES));

export function planToolConstruction(toolsAllow?: string[]): ToolConstructionPlan {
	const empty: ToolConstructionPlan = {
		includeFileTools: false,
		includeCronTools: false,
		includeShellTools: false,
		includeWebTools: false,
		includeMessagingTools: false,
		includeMcpTools: false,
		includeLspTools: false,
		includeToolSearchControls: false,
	};
	if (toolsAllow !== undefined && toolsAllow.length === 0) return empty;
	if (toolsAllow === undefined) {
		return {
			...empty,
			includeFileTools: true,
			includeCronTools: true,
			includeShellTools: true,
		};
	}
	const normalized = toolsAllow.map(normalizeToolName);
	if (normalized.includes('*')) {
		return { ...empty, includeFileTools: true, includeCronTools: true, includeShellTools: true };
	}
	const plan = { ...empty };
	for (const name of normalized) {
		if (
			name.startsWith('group:file') ||
			name.startsWith('group:filesystem') ||
			name.startsWith('group:core') ||
			name.startsWith('group:state') ||
			name.startsWith('group:human') ||
			name.startsWith('group:subagent') ||
			name.startsWith('group:skill') ||
			name.startsWith('group:mcp')
		) {
			plan.includeFileTools = true;
		} else if (name.startsWith('group:script') || name.startsWith('group:shell')) {
			plan.includeShellTools = true;
		} else if (name.startsWith('group:cron')) {
			plan.includeCronTools = true;
		} else if (!name.startsWith('group:')) {
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
	const policyResult = applyToolPolicyPipeline(candidates, {
		sender: options.sender,
		stages: buildPolicyStages(options),
		diagnostics,
	});
	const tools = prepareRuntimeTools(policyResult.tools, options, diagnostics);

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
			...createFileTools({
				workspaceDir: options.workspaceDir,
				sessionId: options.sessionId,
				fsPolicy,
				signal: options.abortSignal,
				services: options.services,
			})
		);
	}
	if (plan.includeShellTools) {
		candidates.push(
			...createScriptTools({
				workspaceDir: options.workspaceDir,
				sessionId: options.sessionId,
				fsPolicy,
				signal: options.abortSignal,
				services: options.services,
			})
		);
	}
	if (plan.includeCronTools) {
		candidates.push(
			...createCronTools({
				workspaceDir: options.workspaceDir,
				sessionId: options.sessionId,
				signal: options.abortSignal,
				services: options.services,
			})
		);
	}
}

function addHostToolCandidates(
	candidates: AgentTool[],
	options: CreateAgentToolsOptions
): void {
	const existingNames = new Set(candidates.map((tool) => normalizeToolName(tool.name)));
	for (const tool of options.hostTools ?? []) {
		const name = normalizeToolName(tool.name);
		if (existingNames.has(name)) continue;
		candidates.push(tool);
		existingNames.add(name);
	}
}

function buildPolicyStages(
	options: CreateAgentToolsOptions
): Partial<Record<PolicyStageName, ToolAccessRule | undefined>> {
	const fsPolicy = options.config?.tools?.fs;
	const runtimeAllow = options.toolsAllow;
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
			policy: options.beforeToolCall?.policy,
			signal: options.abortSignal,
			loopDetector: tracker,
			diagnostics,
		})
	);

	return effective;
}

function readOnlyPolicy(readOnly: boolean | undefined): ToolAccessRule | undefined {
	return readOnly
		? {
				deny: [...AGENT_TOOL_READ_ONLY_DENY_NAMES],
			}
		: undefined;
}

function mergeToolPolicy(...policies: Array<ToolAccessRule | undefined>): ToolAccessRule | undefined {
	const present = policies.filter((policy): policy is ToolAccessRule => policy !== undefined);
	if (present.length === 0) return undefined;
	return {
		profile: present[present.length - 1]?.profile,
		allow: mergeList(present.map((policy) => policy.allow)),
		alsoAllow: mergeList(present.map((policy) => policy.alsoAllow)),
		deny: mergeList(present.map((policy) => policy.deny)),
		fs: Object.assign({}, ...present.map((policy) => policy.fs ?? {})),
	};
}

function mergeList(values: Array<string[] | undefined>): string[] | undefined {
	const present = values.filter((value): value is string[] => value !== undefined);
	return present.length > 0 ? present.flat() : undefined;
}

export function clientToolNames(tools: AgentTool[]): string[] {
	return tools
		.filter((tool) => FILE_TOOL_NAMES.has(normalizeToolName(tool.name)))
		.map((tool) => tool.name);
}
