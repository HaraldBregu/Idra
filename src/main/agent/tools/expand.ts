import type { AgentTool, ToolDiagnostics } from './core/common';
import { getToolMetadata } from './core/common';
import {
	CORE_TOOL_GROUPS,
	createToolAccessIndex,
	expandToolEntries,
	expandToolProfile,
	globMatchToolAccessEntry,
	type ToolAccessIndex,
	type ToolAccessRule,
	type ToolAccessSubject,
	type ToolProfile,
} from './access';

export type { ToolAccessRule as ToolPolicy };

export type ToolCatalogIndex = ToolAccessIndex;

export function createToolCatalogIndex(tools: AgentTool[]): ToolCatalogIndex {
	return createToolAccessIndex(tools.map(toolPolicySubject));
}

export function globMatch(pattern: string, name: string): boolean {
	return globMatchToolAccessEntry(pattern, name);
}

export function expandPolicyEntries(
	entries: readonly string[] | undefined,
	tools: readonly AgentTool[],
	diagnostics?: Pick<ToolDiagnostics, 'warnings'>,
	stage = 'policy'
): Set<string> | undefined {
	return expandToolEntries(
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
	return expandToolProfile(
		profile,
		[...tools].map(toolPolicySubject),
		diagnostics?.warnings,
		stage
	);
}

function toolPolicySubject(tool: AgentTool): ToolAccessSubject {
	const metadata = getToolMetadata(tool);
	return {
		name: tool.name,
		ownerOnly: tool.ownerOnly,
		optional: metadata?.optional,
		ownerKind: metadata?.ownerKind,
		pluginId: metadata?.pluginId,
	};
}
