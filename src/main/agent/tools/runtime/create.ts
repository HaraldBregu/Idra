import type { AgentTool, ToolDiagnostics } from '../core/common';
import type { FridayServices } from '../core/types';
import {
	assertUniqueToolNames,
	createToolDiagnostics,
	normalizeToolName,
} from '../core/common';
import { createFileTools } from '../files/runtime';
import { createCronTools } from '../cron/runtime';
import { normalizeToolSchemas } from '../core/normalize';
import type { ToolPolicy, ToolPolicyStageName } from '../../../policy';
import { applyToolPolicyPipeline } from '../pipeline';
import {
	wrapToolWithBeforeToolCall,
	type BeforeToolCallContext,
	newCallTracker,
} from '../wrap';

type AppConfig = Record<string, unknown>;
type AuthContext = Record<string, unknown>;
type DeliveryContext = Record<string, unknown>;

type PolicyStageName = ToolPolicyStageName;

export type SandboxContext = {
	sandboxed?: boolean;
	readOnly?: boolean;
	policy?: ToolPolicy;
};

export type CreateAgentToolsOptions = {
	config?: AppConfig & {
		toolPolicies?: Partial<Record<PolicyStageName, ToolPolicy | undefined>>;
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
	filesystem_create: 'includeFileTools',
	filesystem_read: 'includeFileTools',
	filesystem_update: 'includeFileTools',
	filesystem_delete: 'includeFileTools',
	filesystem_list: 'includeFileTools',
	filesystem_move: 'includeFileTools',
	filesystem_copy: 'includeFileTools',
	filesystem_search: 'includeFileTools',
	cron_create: 'includeCronTools',
	cron_read: 'includeCronTools',
	cron_update: 'includeCronTools',
	cron_delete: 'includeCronTools',
	cron_list: 'includeCronTools',
	cron_start: 'includeCronTools',
	cron_stop: 'includeCronTools',
	cron_run: 'includeCronTools',
};

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
		};
	}
	const normalized = toolsAllow.map(normalizeToolName);
	if (normalized.includes('*')) {
		return { ...empty, includeFileTools: true, includeCronTools: true };
	}
	const plan = { ...empty };
	for (const name of normalized) {
		if (name.startsWith('group:file') || name.startsWith('group:filesystem')) {
			plan.includeFileTools = true;
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
		policy: options.services?.policy,
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
		if (!FILE_TOOL_NAMES.has(name) || existingNames.has(name)) continue;
		candidates.push(tool);
		existingNames.add(name);
	}
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
			policy: options.beforeToolCall?.policy ?? options.services?.policy,
			signal: options.abortSignal,
			loopDetector: tracker,
			diagnostics,
		})
	);

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
	return tools
		.filter((tool) => FILE_TOOL_NAMES.has(normalizeToolName(tool.name)))
		.map((tool) => tool.name);
}
