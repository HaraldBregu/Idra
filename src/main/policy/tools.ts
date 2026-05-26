export type ToolPolicyProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';

export type ToolPolicy = {
	profile?: ToolPolicyProfile;
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
};

export type ToolPolicyStageName =
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

export const TOOL_POLICY_STAGE_ORDER: ToolPolicyStageName[] = [
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

export type ToolPolicySubject = {
	name: string;
	ownerOnly?: boolean;
	optional?: boolean;
	ownerKind?: string;
	pluginId?: string;
	groups?: string[];
};

export type ToolPolicyFiltered = {
	toolName: string;
	stage: string;
	reason: string;
};

export type ToolPolicyEvaluationContext = {
	sender?: { id?: string; isOwner?: boolean; trustedOwnerGrant?: boolean };
	trustedOwnerToolGrants?: string[];
	stages?: Partial<Record<ToolPolicyStageName, ToolPolicy | undefined>>;
	warnings?: string[];
};

export type ToolPolicyEvaluation = {
	allowed: Set<string>;
	filtered: ToolPolicyFiltered[];
	warnings: string[];
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
			status: 'error' | 'blocked';
			deniedReason: 'loop_detected' | 'approval_required';
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

export type ToolApprovalPolicyDecisionInput = {
	toolName: string;
	approvalAvailable: boolean;
	approvalDecision?: 'allow-once' | 'allow-always' | 'deny' | boolean | null;
	requiredReason?: string;
	deniedReason?: string;
};

export type ToolApprovalPolicyDecision =
	| { outcome: 'allow'; resolution: 'allow-once' | 'allow-always' }
	| { outcome: 'deny'; resolution: 'deny'; reason: string; deniedReason: string };

const FILE_TOOL_NAMES = [
	'read',
	'write',
	'edit',
	'apply_patch',
	'delete',
	'copy',
	'move',
	'inspect_file',
	'find',
] as const;

const FILESYSTEM_TOOL_NAMES = [
	'filesystem_create',
	'filesystem_read',
	'filesystem_update',
	'filesystem_delete',
	'filesystem_list',
	'filesystem_move',
	'filesystem_copy',
	'filesystem_search',
] as const;

const CRON_TOOL_NAMES = [
	'cron_create',
	'cron_read',
	'cron_update',
	'cron_delete',
	'cron_list',
	'cron_start',
	'cron_stop',
	'cron_run',
] as const;

export const TOOL_POLICY_CORE_GROUPS: Record<string, readonly string[]> = {
	'group:file': FILE_TOOL_NAMES,
	'group:filesystem': FILESYSTEM_TOOL_NAMES,
	'group:cron': CRON_TOOL_NAMES,
};

const PROFILE_ALLOW: Record<ToolPolicyProfile, readonly string[] | '*'> = {
	minimal: [],
	coding: FILE_TOOL_NAMES,
	messaging: [],
	standard: FILE_TOOL_NAMES,
	full: '*',
};

export type ToolPolicyIndex = {
	names: Map<string, ToolPolicySubject>;
	pluginIds: Map<string, string[]>;
	ownerGroups: Map<string, string[]>;
};

export function evaluateToolPolicy(
	subjects: readonly ToolPolicySubject[],
	context: ToolPolicyEvaluationContext = {}
): ToolPolicyEvaluation {
	const index = createToolPolicyIndex(subjects);
	const filtered: ToolPolicyFiltered[] = [];
	const warnings = context.warnings ?? [];
	const trustedGrants = new Set(
		(context.trustedOwnerToolGrants ?? []).map(normalizeToolPolicyName)
	);
	let current = new Set(index.names.keys());

	for (const subject of subjects) {
		const name = normalizeToolPolicyName(subject.name);
		if (!current.has(name)) continue;
		if (!subject.ownerOnly) continue;
		if (context.sender?.isOwner || context.sender?.trustedOwnerGrant) continue;
		if (trustedGrants.has(name)) continue;
		current.delete(name);
		filtered.push({
			toolName: subject.name,
			stage: 'ownerOnly',
			reason: 'owner-only tool hidden from non-owner sender',
		});
	}

	for (const stage of TOOL_POLICY_STAGE_ORDER) {
		const policy = context.stages?.[stage];
		if (!policy) continue;
		const before = new Set(current);
		const profileAllow = expandToolPolicyProfile(policy.profile, index, warnings, stage);
		const allow = expandToolPolicyEntries(policy.allow, index, warnings, stage);
		const alsoAllow = expandToolPolicyEntries(policy.alsoAllow, index, warnings, stage);
		const deny = expandToolPolicyEntries(policy.deny, index, warnings, stage);
		const grant = unionSets(profileAllow, allow, alsoAllow);

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
				reason: deny?.has(name) ? 'denied by policy' : 'not included by allow policy',
			});
		}
	}

	const hiddenNames = new Set(filtered.map((entry) => normalizeToolPolicyName(entry.toolName)));
	for (const subject of subjects) {
		const name = normalizeToolPolicyName(subject.name);
		if (!subject.optional || current.has(name) || hiddenNames.has(name)) continue;
		filtered.push({
			toolName: subject.name,
			stage: 'optional',
			reason: 'optional tool was not explicitly selected',
		});
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

	if (input.requiresApproval && !input.approvalCached) {
		return {
			outcome: 'deny',
			key,
			callCount: input.callCount,
			status: 'blocked',
			deniedReason: 'approval_required',
			reason: `tool ${input.toolName} requires approval before execution.`,
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

// Pass-through: PolicyConfig has no "allow tools" concept; tools are always enabled.
export function evaluateToolRequestPolicy(
	_input: ToolRequestPolicyInput
): ToolRequestPolicyDecision {
	return { shouldUseTools: true, reason: '' };
}

export function evaluateToolHookPolicy(input: ToolHookPolicyInput): ToolHookPolicyDecision {
	if (input.block === true || input.allow === false) {
		return {
			outcome: 'deny',
			reason: input.blockReason ?? input.reason ?? `Tool ${input.toolName} was blocked by policy.`,
			deniedReason: input.deniedReason ?? 'hook_veto',
		};
	}
	return { outcome: 'allow' };
}

export function evaluateToolApprovalPolicy(
	input: ToolApprovalPolicyDecisionInput
): ToolApprovalPolicyDecision {
	if (!input.approvalAvailable) {
		return {
			outcome: 'deny',
			resolution: 'deny',
			reason: input.requiredReason || `Tool ${input.toolName} requires approval before execution.`,
			deniedReason: 'approval_required',
		};
	}

	if (
		input.approvalDecision === false ||
		input.approvalDecision === null ||
		input.approvalDecision === 'deny'
	) {
		return {
			outcome: 'deny',
			resolution: 'deny',
			reason: input.deniedReason || `Tool ${input.toolName} was not approved for execution.`,
			deniedReason: 'approval_denied',
		};
	}

	return {
		outcome: 'allow',
		resolution: input.approvalDecision === 'allow-always' ? 'allow-always' : 'allow-once',
	};
}

export function toolUsePolicyKey(toolName: string, params: unknown): string {
	return `${toolName}::${JSON.stringify(params ?? {})}`;
}

export function createToolPolicyIndex(subjects: readonly ToolPolicySubject[]): ToolPolicyIndex {
	const names = new Map<string, ToolPolicySubject>();
	const pluginIds = new Map<string, string[]>();
	const ownerGroups = new Map<string, string[]>();

	for (const subject of subjects) {
		const name = normalizeToolPolicyName(subject.name);
		names.set(name, subject);

		if (subject.pluginId) {
			const pluginId = normalizeToolPolicyName(subject.pluginId);
			addIndexedName(pluginIds, pluginId, name);
			addIndexedName(pluginIds, `plugin:${pluginId}`, name);
		}

		if (subject.ownerKind) {
			const ownerKind = normalizeToolPolicyName(subject.ownerKind);
			addIndexedName(
				ownerGroups,
				`group:${ownerKind === 'plugin' ? 'plugins' : ownerKind}`,
				name
			);
		}

		for (const group of subject.groups ?? []) {
			addIndexedName(ownerGroups, normalizeToolPolicyName(group), name);
		}
	}

	return { names, pluginIds, ownerGroups };
}

export function normalizeToolPolicyName(name: string): string {
	return name.trim().toLowerCase();
}

export function globMatchToolPolicyEntry(pattern: string, name: string): boolean {
	if (pattern === name) return true;
	if (!pattern.includes('*')) return false;
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	return new RegExp(`^${escaped}$`).test(name);
}

export function expandToolPolicyEntries(
	entries: readonly string[] | undefined,
	index: ToolPolicyIndex,
	warnings?: string[],
	stage = 'policy'
): Set<string> | undefined {
	if (entries === undefined) return undefined;
	const expanded = new Set<string>();
	const allNames = [...index.names.keys()];

	for (const rawEntry of entries) {
		const entry = normalizeToolPolicyName(rawEntry);
		if (entry === '*') {
			allNames.forEach((name) => expanded.add(name));
			continue;
		}

		const groupNames = TOOL_POLICY_CORE_GROUPS[entry] ?? index.ownerGroups.get(entry);
		if (groupNames) {
			groupNames.filter((name) => index.names.has(name)).forEach((name) => expanded.add(name));
			continue;
		}

		const pluginNames = index.pluginIds.get(entry);
		if (pluginNames) {
			pluginNames.forEach((name) => expanded.add(name));
			continue;
		}

		if (entry.includes('*')) {
			const matches = allNames.filter((name) => globMatchToolPolicyEntry(entry, name));
			if (matches.length === 0) {
				warnings?.push(`${stage}: allow/deny entry '${rawEntry}' matched no tools`);
			}
			matches.forEach((name) => expanded.add(name));
			continue;
		}

		if (index.names.has(entry)) {
			expanded.add(entry);
			continue;
		}

		warnings?.push(`${stage}: unknown tool policy entry '${rawEntry}'`);
	}

	return expanded;
}

export function expandToolPolicyProfile(
	profile: ToolPolicyProfile | undefined,
	index: ToolPolicyIndex,
	warnings?: string[],
	stage = 'profile'
): Set<string> | undefined {
	if (!profile) return undefined;
	const entries = PROFILE_ALLOW[profile];
	return entries === '*'
		? expandToolPolicyEntries(['*'], index, warnings, stage)
		: expandToolPolicyEntries(entries, index, warnings, stage);
}

function addIndexedName(index: Map<string, string[]>, key: string, name: string): void {
	index.set(key, [...(index.get(key) ?? []), name]);
}

function unionSets(...sets: Array<Set<string> | undefined>): Set<string> | undefined {
	const present = sets.filter((set): set is Set<string> => set !== undefined);
	if (present.length === 0) return undefined;
	const out = new Set<string>();
	for (const set of present) {
		for (const value of set) out.add(value);
	}
	return out;
}
