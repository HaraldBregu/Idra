export { evaluate } from './evaluate';
export { match } from './match';
export { PolicyService, type PolicyServiceOptions, type PolicyServicePort } from './service';
export {
	PolicyStore,
	defaultPolicyConfig,
	type PolicyStoreAccessor,
} from './store';
export {
	evaluateToolPolicy,
	createToolPolicyIndex,
	evaluateToolApprovalPolicy,
	evaluateToolHookPolicy,
	expandToolPolicyEntries,
	expandToolPolicyProfile,
	evaluateToolRequestPolicy,
	evaluateToolUsePolicy,
	globMatchToolPolicyEntry,
	normalizeToolPolicyName,
	toolUsePolicyKey,
	TOOL_POLICY_CORE_GROUPS,
	TOOL_POLICY_STAGE_ORDER,
	type ToolPolicy,
	type ToolPolicyEvaluation,
	type ToolPolicyEvaluationContext,
	type ToolPolicyFiltered,
	type ToolPolicyIndex,
	type ToolPolicyProfile,
	type ToolPolicyStageName,
	type ToolPolicySubject,
	type ToolRequestPolicyDecision,
	type ToolRequestPolicyInput,
	type ToolApprovalPolicyDecision,
	type ToolApprovalPolicyDecisionInput,
	type ToolHookPolicyDecision,
	type ToolHookPolicyInput,
	type ToolUsePolicyDecision,
	type ToolUsePolicyInput,
} from './tools';
export type {
	Permission,
	PolicyOutcome,
	PolicyEntry,
	PolicyConfig as SharedPolicyConfig,
	PolicyDecision,
} from '../../shared/policy';

export type { ToolPolicyProfile as ToolProfile } from './tools';

export type { AgentTool } from '../tools/core/common';

export interface PolicyConfig {
	profile: ToolProfile;
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
}

export function filterTools(all: AgentTool[], cfg: PolicyConfig): AgentTool[] {
	const result = evaluateToolPolicy(
		all.map((tool) => ({ name: tool.name, ownerOnly: tool.ownerOnly })),
		{
			stages: {
				profile: { profile: cfg.profile, alsoAllow: cfg.alsoAllow },
				runtime: {
					allow: cfg.allow.length > 0 ? cfg.allow : undefined,
					deny: cfg.deny,
				},
			},
		}
	);
	return all.filter((tool) => result.allowed.has(normalizeToolPolicyName(tool.name)));
}
