import {
	AGENT_TOOL_GROUPS,
	AGENT_TOOL_LEGACY_ALIASES,
	type AgentToolGroupName,
	type AgentToolProfile,
} from '../../../shared/tools';

export type ToolProfile = AgentToolProfile;

export type ToolAccessRule = {
	profile?: ToolProfile;
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
};

export type ToolAccessStageName =
	| 'profile'
	| 'providerProfile'
	| 'global'
	| 'providerGlobal'
	| 'agent'
	| 'providerAgent'
	| 'channelGroup'
	| 'sender'
	| 'sandbox'
	| 'subagent'
	| 'inheritedParent'
	| 'runtime';

export const TOOL_ACCESS_STAGE_ORDER: ToolAccessStageName[] = [
	'profile',
	'providerProfile',
	'global',
	'providerGlobal',
	'agent',
	'providerAgent',
	'channelGroup',
	'sender',
	'sandbox',
	'subagent',
	'inheritedParent',
	'runtime',
];

export type ToolAccessSubject = {
	name: string;
	ownerOnly?: boolean;
	optional?: boolean;
	ownerKind?: string;
	pluginId?: string;
	groups?: string[];
};

export type ToolAccessFiltered = {
	toolName: string;
	stage: string;
	reason: string;
};

export type ToolAccessEvaluation = {
	allowed: Set<string>;
	filtered: ToolAccessFiltered[];
	warnings: string[];
};

export type ToolAccessIndex = {
	names: Map<string, ToolAccessSubject>;
	pluginIds: Map<string, string[]>;
	ownerGroups: Map<string, string[]>;
};

export type ToolUsePolicyInput = {
	toolName: string;
	params?: unknown;
	callCount: number;
	loopWarnAt?: number;
	loopStopAt?: number;
	requiresApproval?: boolean;
	approvalCached?: boolean;
};

export type ToolUsePolicyDecision =
	| {
			outcome: 'allow';
			key: string;
			callCount: number;
			warning?: string;
	  }
	| {
			outcome: 'deny';
			key: string;
			callCount: number;
			status: 'error' | 'blocked' | 'rejected';
			deniedReason: 'loop_detected';
			reason: string;
	  };

export type ToolRequestPolicyInput = {
	userRequest: string;
};

export type ToolRequestPolicyDecision = {
	shouldUseTools: boolean;
	reason: string;
};

export type ToolHookPolicyInput = {
	toolName: string;
	allow?: boolean;
	block?: boolean;
	reason?: string;
	blockReason?: string;
	deniedReason?: string;
};

export type ToolHookPolicyDecision =
	| { outcome: 'allow' }
	| { outcome: 'deny'; reason: string; deniedReason: string };

const TOOL_ACCESS_CORE_GROUPS: Record<string, readonly string[]> = {
	'group:coreworkspace': toolNamesForSharedGroup('coreWorkspace'),
	'group:core_workspace': toolNamesForSharedGroup('coreWorkspace'),
	'group:file': toolNamesForSharedGroup('coreWorkspace'),
	'group:filesystem': toolNamesForSharedGroup('coreWorkspace'),
	'group:shell': ['run_shell', 'script_run'],
	'group:statetask': toolNamesForSharedGroup('stateTask'),
	'group:state_task': toolNamesForSharedGroup('stateTask'),
	'group:state': toolNamesForSharedGroup('stateTask'),
	'group:humandecision': toolNamesForSharedGroup('humanDecision'),
	'group:human_decision': toolNamesForSharedGroup('humanDecision'),
	'group:human': toolNamesForSharedGroup('humanDecision'),
	'group:subagent': toolNamesForSharedGroup('subagent'),
	'group:skill': toolNamesForSharedGroup('skill'),
	'group:mcpconnector': toolNamesForSharedGroup('mcpConnector'),
	'group:mcp_connector': toolNamesForSharedGroup('mcpConnector'),
	'group:mcp': toolNamesForSharedGroup('mcpConnector'),
	'group:script': toolNamesForSharedGroup('script'),
	'group:cron': toolNamesForSharedGroup('cron'),
};

export const CORE_TOOL_GROUPS = TOOL_ACCESS_CORE_GROUPS;

export function evaluateToolAccess(
	subjects: readonly ToolAccessSubject[],
	context: {
		stages?: Partial<Record<ToolAccessStageName, ToolAccessRule | undefined>>;
		warnings?: string[];
	} = {}
): ToolAccessEvaluation {
	const index = createToolAccessIndex(subjects);
	const filtered: ToolAccessFiltered[] = [];
	const warnings = context.warnings ?? [];
	let current = new Set(index.names.keys());

	for (const stage of TOOL_ACCESS_STAGE_ORDER) {
		const rule = context.stages?.[stage];
		if (!rule) continue;
		const before = new Set(current);
		const allow = expandToolEntries(rule.allow, index, warnings, stage);
		const alsoAllow = expandToolEntries(rule.alsoAllow, index, warnings, stage);
		const deny = expandToolEntries(rule.deny, index, warnings, stage);
		const grant = unionSets(allow, alsoAllow);

		if (grant !== undefined) {
			current = new Set([...current].filter((name) => grant.has(name)));
		}
		if (deny && deny.size > 0) {
			current = new Set([...current].filter((name) => !deny.has(name)));
		}

		for (const name of before) {
			if (current.has(name)) continue;
			filtered.push({
				toolName: index.names.get(name)?.name ?? name,
				stage,
				reason: deny?.has(name) ? 'denied by explicit tool denylist' : 'not selected by explicit tool allowlist',
			});
		}
	}

	return { allowed: current, filtered, warnings };
}

export function evaluateToolUsePolicy(input: ToolUsePolicyInput): ToolUsePolicyDecision {
	const key = toolUsePolicyKey(input.toolName, input.params);
	const loopWarnAt = input.loopWarnAt ?? 3;
	const loopStopAt = input.loopStopAt ?? 5;

	if (input.callCount > loopStopAt) {
		return {
			outcome: 'deny',
			key,
			callCount: input.callCount,
			status: 'error',
			deniedReason: 'loop_detected',
			reason: `loop detector: identical call to ${input.toolName} has occurred ${input.callCount} times. Stopping. Change approach.`,
		};
	}

	return {
		outcome: 'allow',
		key,
		callCount: input.callCount,
		warning:
			input.callCount >= loopWarnAt
				? `note: this is the ${input.callCount}th identical call to ${input.toolName}; consider a different approach.`
				: undefined,
	};
}

export function evaluateToolRequestPolicy(_input: ToolRequestPolicyInput): ToolRequestPolicyDecision {
	return { shouldUseTools: true, reason: 'tools are available for every request' };
}

export function evaluateToolHookPolicy(input: ToolHookPolicyInput): ToolHookPolicyDecision {
	if (input.block === true || input.allow === false) {
		return {
			outcome: 'deny',
			reason: input.blockReason ?? input.reason ?? `Tool ${input.toolName} was blocked.`,
			deniedReason: input.deniedReason ?? 'hook_veto',
		};
	}
	return { outcome: 'allow' };
}

export function toolUsePolicyKey(toolName: string, params: unknown): string {
	return `${toolName}::${JSON.stringify(params ?? {})}`;
}

export function createToolAccessIndex(subjects: readonly ToolAccessSubject[]): ToolAccessIndex {
	const names = new Map<string, ToolAccessSubject>();
	const pluginIds = new Map<string, string[]>();
	const ownerGroups = new Map<string, string[]>();

	for (const subject of subjects) {
		const name = normalizeToolAccessName(subject.name);
		names.set(name, subject);
		if (subject.pluginId) addIndexedName(pluginIds, normalizeToolAccessName(subject.pluginId), name);
		if (subject.ownerKind) addIndexedName(ownerGroups, normalizeToolAccessName(subject.ownerKind), name);
		for (const group of subject.groups ?? []) {
			addIndexedName(ownerGroups, normalizeToolAccessName(group), name);
		}
	}

	return { names, pluginIds, ownerGroups };
}

export function normalizeToolAccessName(name: string): string {
	return name.trim().toLowerCase();
}

export function globMatchToolAccessEntry(pattern: string, name: string): boolean {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	return new RegExp(`^${escaped}$`).test(name);
}

export function expandToolEntries(
	entries: readonly string[] | undefined,
	subjectsOrIndex: readonly ToolAccessSubject[] | ToolAccessIndex,
	warnings?: string[],
	stage = 'tools'
): Set<string> | undefined {
	if (!entries) return undefined;
	const index = toToolAccessIndex(subjectsOrIndex);
	const expanded = new Set<string>();
	const allNames = [...index.names.keys()];

	for (const rawEntry of entries) {
		const entry = normalizeToolAccessName(rawEntry);
		if (!entry) continue;
		if (index.names.has(entry)) {
			expanded.add(entry);
			continue;
		}
		const alias = AGENT_TOOL_LEGACY_ALIASES[entry as keyof typeof AGENT_TOOL_LEGACY_ALIASES];
		if (alias) {
			for (const name of alias) {
				const normalized = normalizeToolAccessName(name);
				if (index.names.has(normalized)) expanded.add(normalized);
			}
			continue;
		}
		if (entry === '*') {
			for (const name of allNames) expanded.add(name);
			continue;
		}
		const group = TOOL_ACCESS_CORE_GROUPS[entry];
		if (group) {
			for (const name of group) {
				const normalized = normalizeToolAccessName(name);
				if (index.names.has(normalized)) expanded.add(normalized);
			}
			continue;
		}
		for (const name of index.pluginIds.get(entry) ?? []) expanded.add(name);
		for (const name of index.ownerGroups.get(entry) ?? []) expanded.add(name);
		if (entry.includes('*')) {
			const matches = allNames.filter((name) => globMatchToolAccessEntry(entry, name));
			for (const name of matches) expanded.add(name);
			if (matches.length > 0) continue;
		}
		if (!index.pluginIds.has(entry) && !index.ownerGroups.has(entry)) {
			warnings?.push(`${stage}: unknown tool entry '${rawEntry}'`);
		}
	}

	return expanded;
}

export function expandToolProfile(
	_profile: ToolProfile | undefined,
	subjectsOrIndex: readonly ToolAccessSubject[] | ToolAccessIndex,
	_warnings?: string[],
	_stage = 'profile'
): Set<string> | undefined {
	const index = toToolAccessIndex(subjectsOrIndex);
	return new Set(index.names.keys());
}

function toToolAccessIndex(subjectsOrIndex: readonly ToolAccessSubject[] | ToolAccessIndex): ToolAccessIndex {
	return 'names' in subjectsOrIndex ? subjectsOrIndex : createToolAccessIndex(subjectsOrIndex);
}

function toolNamesForSharedGroup(group: AgentToolGroupName): readonly string[] {
	return AGENT_TOOL_GROUPS[group].map((tool) => tool.name);
}

function addIndexedName(index: Map<string, string[]>, key: string, name: string): void {
	const current = index.get(key) ?? [];
	if (!current.includes(name)) index.set(key, [...current, name]);
}

function unionSets(...sets: Array<Set<string> | undefined>): Set<string> | undefined {
	const present = sets.filter((set): set is Set<string> => set !== undefined);
	if (present.length === 0) return undefined;
	return new Set(present.flatMap((set) => [...set]));
}
