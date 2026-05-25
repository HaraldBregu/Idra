import type { AgentTool, ToolDiagnostics } from '../core/common';
import { getToolMetadata, normalizeToolName } from '../core/common';
import {
	createToolPolicyIndex,
	expandToolPolicyEntries,
	expandToolPolicyProfile,
	globMatchToolPolicyEntry,
	TOOL_POLICY_CORE_GROUPS,
	type ToolPolicy,
	type ToolPolicyIndex,
	type ToolPolicyProfile,
	type ToolPolicySubject,
} from '../../policy';

export type ToolProfile = ToolPolicyProfile;
export type { ToolPolicy };
export const CORE_TOOL_GROUPS = TOOL_POLICY_CORE_GROUPS;

export type ToolCatalogIndex = ToolPolicyIndex;

export function createToolCatalogIndex(tools: AgentTool[]): ToolCatalogIndex {
	return createToolPolicyIndex(tools.map(toolPolicySubject));
}

export function globMatch(pattern: string, name: string): boolean {
	return globMatchToolPolicyEntry(pattern, name);
}

export function expandPolicyEntries(
	entries: readonly string[] | undefined,
	tools: readonly AgentTool[],
	diagnostics?: Pick<ToolDiagnostics, 'warnings'>,
	stage = 'policy'
): Set<string> | undefined {
	return expandToolPolicyEntries(
		entries,
		createToolCatalogIndex([...tools]),
		diagnostics?.warnings,
		stage
	);
}

export function expandProfile(
	profile: ToolProfile | undefined,
	tools: readonly AgentTool[],
	diagnostics?: Pick<ToolDiagnostics, 'warnings'>,
	stage = 'profile'
): Set<string> | undefined {
	return expandToolPolicyProfile(
		profile,
		createToolCatalogIndex([...tools]),
		diagnostics?.warnings,
		stage
	);
}

function toolPolicySubject(tool: AgentTool): ToolPolicySubject {
	const metadata = getToolMetadata(tool);
	return {
		name: normalizeToolName(tool.name),
		ownerOnly: tool.ownerOnly,
		optional: metadata?.optional,
		ownerKind: metadata?.ownerKind,
		pluginId: metadata?.pluginId,
	};
}
