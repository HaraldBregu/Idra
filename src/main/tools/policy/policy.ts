import type { AgentTool } from '../core/types';
import {
	evaluateToolPolicy,
	normalizeToolPolicyName,
	type ToolPolicyProfile,
} from '../../policy';

export type ToolProfile = ToolPolicyProfile;

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
