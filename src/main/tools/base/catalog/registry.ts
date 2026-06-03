import { ToolPolicyService, type ToolPolicyServicePort, type ToolPolicySubject, type ToolProfile } from '../../shared/tool-types';
import type { AgentTool } from '../tool';
import { normalizeToolName } from '../common';
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

export interface ToolRegistryConfig {
	profile: ToolProfile;
	allow: string[];
	alsoAllow?: string[];
	deny: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
}

const defaultToolPolicyService = new ToolPolicyService();

export function createTools(
	cfg: ToolRegistryConfig,
	policy: Pick<ToolPolicyServicePort, 'evaluateTools'> = defaultToolPolicyService
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
				deny: cfg.deny,
			},
		},
	});
	return tools.filter((tool) => result.allowed.has(normalizeToolName(tool.name)));
}
