import { PolicyService, type PolicyServicePort, type ToolPolicySubject, type ToolProfile } from '../../policy';
import type { AgentTool } from '../core/types';
import { normalizeToolName } from '../core/common';
import { LOCAL_TOOL_CATALOG, localToolCatalogByName } from './catalog';

export {
	LOCAL_TOOL_CATALOG,
	localToolCatalogByName,
	localToolNamesForGroup,
	localToolNamesForProfile,
	type LocalToolApprovalPolicy,
	type LocalToolCatalogEntry,
	type LocalToolGroup,
	type LocalToolProfile,
} from './catalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PRELOADED_LOCAL_TOOLS: AgentTool<any, any>[] = LOCAL_TOOL_CATALOG.map(
	(entry) => entry.tool
);

export const ALL_TOOLS = PRELOADED_LOCAL_TOOLS;

export interface PolicyConfig {
	profile: ToolProfile;
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
}

const defaultPolicyService = new PolicyService();

const DISABLED_TOOL_GROUPS: readonly string[] = [
	'group:stateTask',
	'group:humanDecision',
	'group:skill',
	'group:mcpConnector',
	'group:cron',
];

export function createTools(
	cfg: PolicyConfig,
	policy: Pick<PolicyServicePort, 'evaluateTools'> = defaultPolicyService
): AgentTool[] {
	const tools = PRELOADED_LOCAL_TOOLS as unknown as AgentTool[];
	const catalog = localToolCatalogByName();
	const subjects: ToolPolicySubject[] = tools.map((tool) => {
		const entry = catalog.get(tool.name);
		return {
			name: tool.name,
			ownerOnly: entry?.ownerOnly,
			groups: entry ? [`group:${entry.group}`] : undefined,
		};
	});
	const result = policy.evaluateTools(subjects, {
		stages: {
			profile: { profile: cfg.profile, alsoAllow: cfg.alsoAllow },
			runtime: {
				allow: cfg.allow.length > 0 ? cfg.allow : undefined,
				deny: [...cfg.deny, ...DISABLED_TOOL_GROUPS],
			},
		},
	});
	return tools.filter((tool) => result.allowed.has(normalizeToolName(tool.name)));
}
