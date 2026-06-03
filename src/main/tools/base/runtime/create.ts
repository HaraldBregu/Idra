import type { AgentTool, ToolDiagnostics } from '../common';
import type { FridayServices } from '../tool';
import { assertUniqueToolNames, createToolDiagnostics, normalizeToolName } from '../common';
import { createRequestedTools } from '../../requested/runtime';
import { normalizeToolSchemas } from '../schema';
import type { ToolPolicy, ToolPolicyStageName } from '../../shared/tool-types';
import { applyToolPolicyPipeline } from '../../shared/pipeline';
import {
	newCallTracker,
	wrapToolWithBeforeToolCall,
	type BeforeToolCallContext,
} from '../../shared/wrap';
import { AGENT_TOOL_NAMES, AGENT_TOOL_READ_ONLY_DENY_NAMES } from '../../../../shared/tools';

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
	includeRequestedTools: boolean;
};

export type CreateAgentToolsResult = {
	tools: AgentTool[];
	candidates: AgentTool[];
	plan: ToolConstructionPlan;
	diagnostics: ToolDiagnostics;
	dispose: () => Promise<void>;
};

const REQUESTED_TOOL_NAMES = new Set(AGENT_TOOL_NAMES.map(normalizeToolName));

export function planToolConstruction(toolsAllow?: string[]): ToolConstructionPlan {
	return { includeRequestedTools: toolsAllow === undefined || toolsAllow.length > 0 };
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

	if (options.includeCoreTools !== false && plan.includeRequestedTools) {
		candidates.push(
			...createRequestedTools({
				workspaceDir: options.workspaceDir,
				sessionId: options.sessionId,
				signal: options.abortSignal,
				services: options.services,
			})
		);
	}
	addHostToolCandidates(candidates, options);

	assertUniqueToolNames(candidates);
	diagnostics.builtTools.push(...candidates.map((tool) => tool.name));

	return candidates;
}

function addHostToolCandidates(candidates: AgentTool[], options: CreateAgentToolsOptions): void {
	const existingNames = new Set(candidates.map((tool) => normalizeToolName(tool.name)));
	for (const tool of options.hostTools ?? []) {
		const name = normalizeToolName(tool.name);
		if (!REQUESTED_TOOL_NAMES.has(name) || existingNames.has(name)) continue;
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
		? {
				deny: [...AGENT_TOOL_READ_ONLY_DENY_NAMES],
			}
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
		.filter((tool) => REQUESTED_TOOL_NAMES.has(normalizeToolName(tool.name)))
		.map((tool) => tool.name);
}
