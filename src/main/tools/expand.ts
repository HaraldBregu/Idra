import type { AgentTool, ToolDiagnostics } from './core/common';
import { getToolMetadata } from './core/common';
import {
	PolicyService,
	type ToolPolicy,
	type ToolPolicyIndex,
	type ToolPolicyProfile,
	type ToolPolicySubject,
} from '../policy';

const policyService = new PolicyService();

export type ToolProfile = ToolPolicyProfile;
export type { ToolPolicy };
export const CORE_TOOL_GROUPS = policyService.getCoreToolGroups();

export type ToolCatalogIndex = ToolPolicyIndex;

export function createToolCatalogIndex(tools: AgentTool[]): ToolCatalogIndex {
	return policyService.createToolPolicyIndex(tools.map(toolPolicySubject));
}

export function globMatch(pattern: string, name: string): boolean {
	return policyService.globMatchToolPolicyEntry(pattern, name);
}

export function expandPolicyEntries(
	entries: readonly string[] | undefined,
	tools: readonly AgentTool[],
	diagnostics?: Pick<ToolDiagnostics, 'warnings'>,
	stage = 'policy'
): Set<string> | undefined {
	return policyService.expandToolPolicyEntries(
		entries,
		[...tools].map(toolPolicySubject),
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
	return policyService.expandToolPolicyProfile(
		profile,
		[...tools].map(toolPolicySubject),
		diagnostics?.warnings,
		stage
	);
}

function toolPolicySubject(tool: AgentTool): ToolPolicySubject {
	const metadata = getToolMetadata(tool);
	return {
		name: tool.name,
		ownerOnly: tool.ownerOnly,
		optional: metadata?.optional,
		ownerKind: metadata?.ownerKind,
		pluginId: metadata?.pluginId,
	};
}
