import type { AgentTool, FilteredToolDiagnostic, ToolDiagnostics } from '../core/common';
import { getToolMetadata, normalizeToolName } from '../core/common';
import { expandPolicyEntries, expandProfile, type ToolPolicy } from './expand';

export type PolicyStageName =
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

export const POLICY_STAGE_ORDER: PolicyStageName[] = [
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

export type ToolPolicyPipelineContext = {
	sender?: { id?: string; isOwner?: boolean; trustedOwnerGrant?: boolean };
	trustedOwnerToolGrants?: string[];
	stages?: Partial<Record<PolicyStageName, ToolPolicy | undefined>>;
	diagnostics?: ToolDiagnostics;
};

export type ToolPolicyPipelineResult = {
	tools: AgentTool[];
	filtered: FilteredToolDiagnostic[];
	warnings: string[];
};

export function applyToolPolicyPipeline(
	tools: AgentTool[],
	context: ToolPolicyPipelineContext = {}
): ToolPolicyPipelineResult {
	const diagnostics = context.diagnostics;
	const filtered: FilteredToolDiagnostic[] = [];
	const warnings = diagnostics?.warnings ?? [];
	const trustedGrants = new Set((context.trustedOwnerToolGrants ?? []).map(normalizeToolName));
	let current = tools.filter((tool) => {
		if (!tool.ownerOnly) return true;
		if (context.sender?.isOwner || context.sender?.trustedOwnerGrant) return true;
		if (trustedGrants.has(normalizeToolName(tool.name))) return true;
		filtered.push({
			toolName: tool.name,
			stage: 'ownerOnly',
			reason: 'owner-only tool hidden from non-owner sender',
		});
		return false;
	});

	for (const stage of POLICY_STAGE_ORDER) {
		const policy = context.stages?.[stage];
		if (!policy) continue;
		const before = new Set(current.map((tool) => normalizeToolName(tool.name)));
		const profileAllow = expandProfile(policy.profile, tools, diagnostics, stage);
		const allow = expandPolicyEntries(policy.allow, tools, diagnostics, stage);
		const alsoAllow = expandPolicyEntries(policy.alsoAllow, tools, diagnostics, stage);
		const deny = expandPolicyEntries(policy.deny, tools, diagnostics, stage);
		const grant = unionSets(profileAllow, allow, alsoAllow);
		if (grant !== undefined) {
			current = current.filter((tool) => grant.has(normalizeToolName(tool.name)));
		}
		if (deny && deny.size > 0) {
			current = current.filter((tool) => !deny.has(normalizeToolName(tool.name)));
		}
		const after = new Set(current.map((tool) => normalizeToolName(tool.name)));
		for (const name of before) {
			if (after.has(name)) continue;
			const tool = tools.find((candidate) => normalizeToolName(candidate.name) === name);
			filtered.push({
				toolName: tool?.name ?? name,
				stage,
				reason: deny?.has(name) ? 'denied by policy' : 'not included by allow policy',
			});
		}
	}

	const hiddenNames = new Set(filtered.map((entry) => normalizeToolName(entry.toolName)));
	for (const tool of tools) {
		const metadata = getToolMetadata(tool);
		if (metadata?.optional && !current.some((candidate) => normalizeToolName(candidate.name) === normalizeToolName(tool.name))) {
			if (!hiddenNames.has(normalizeToolName(tool.name))) {
				filtered.push({
					toolName: tool.name,
					stage: 'optional',
					reason: 'optional tool was not explicitly selected',
				});
			}
		}
	}

	if (diagnostics) diagnostics.filteredTools.push(...filtered);
	return { tools: current, filtered, warnings };
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
