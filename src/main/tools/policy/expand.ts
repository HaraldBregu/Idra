import type { AgentTool, ToolDiagnostics } from '../core/common';
import { getToolMetadata, normalizeToolName } from '../core/common';

export type ToolProfile = 'minimal' | 'coding' | 'messaging' | 'full';

export type ToolPolicy = {
	profile?: ToolProfile;
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
};

export const CORE_TOOL_GROUPS: Record<string, string[]> = {
	'group:file': [
		'read',
		'write',
		'edit',
		'apply_patch',
		'delete',
		'copy',
		'move',
		'inspect_file',
		'find',
	],
};

const PROFILE_ALLOW: Record<ToolProfile, string[] | '*'> = {
	minimal: [],
	coding: CORE_TOOL_GROUPS['group:file'],
	messaging: [],
	full: '*',
};

export type ToolCatalogIndex = {
	names: Map<string, AgentTool>;
	pluginIds: Map<string, string[]>;
	ownerGroups: Map<string, string[]>;
};

export function createToolCatalogIndex(tools: AgentTool[]): ToolCatalogIndex {
	const names = new Map<string, AgentTool>();
	const pluginIds = new Map<string, string[]>();
	const ownerGroups = new Map<string, string[]>();
	for (const tool of tools) {
		const normalized = normalizeToolName(tool.name);
		names.set(normalized, tool);
		const metadata = getToolMetadata(tool);
		if (metadata?.pluginId) {
			const key = normalizeToolName(metadata.pluginId);
			pluginIds.set(key, [...(pluginIds.get(key) ?? []), normalized]);
			pluginIds.set(`plugin:${key}`, [...(pluginIds.get(`plugin:${key}`) ?? []), normalized]);
		}
		if (metadata?.ownerKind) {
			const key = `group:${metadata.ownerKind === 'plugin' ? 'plugins' : metadata.ownerKind}`;
			ownerGroups.set(key, [...(ownerGroups.get(key) ?? []), normalized]);
		}
	}
	return { names, pluginIds, ownerGroups };
}

export function globMatch(pattern: string, name: string): boolean {
	if (pattern === name) return true;
	if (!pattern.includes('*')) return false;
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	return new RegExp(`^${escaped}$`).test(name);
}

export function expandPolicyEntries(
	entries: readonly string[] | undefined,
	tools: readonly AgentTool[],
	diagnostics?: Pick<ToolDiagnostics, 'warnings'>,
	stage = 'policy'
): Set<string> | undefined {
	if (entries === undefined) return undefined;
	const index = createToolCatalogIndex([...tools]);
	const expanded = new Set<string>();
	const allNames = [...index.names.keys()];
	for (const rawEntry of entries) {
		const entry = normalizeToolName(rawEntry);
		if (entry === '*') {
			allNames.forEach((name) => expanded.add(name));
			continue;
		}
		const groupNames = CORE_TOOL_GROUPS[entry] ?? index.ownerGroups.get(entry);
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
			const matches = allNames.filter((name) => globMatch(entry, name));
			if (matches.length === 0)
				diagnostics?.warnings.push(`${stage}: allow/deny entry '${rawEntry}' matched no tools`);
			matches.forEach((name) => expanded.add(name));
			continue;
		}
		if (index.names.has(entry)) {
			expanded.add(entry);
			continue;
		}
		diagnostics?.warnings.push(`${stage}: unknown tool policy entry '${rawEntry}'`);
	}
	return expanded;
}

export function expandProfile(
	profile: ToolProfile | undefined,
	tools: readonly AgentTool[],
	diagnostics?: Pick<ToolDiagnostics, 'warnings'>,
	stage = 'profile'
): Set<string> | undefined {
	if (!profile) return undefined;
	const entries = PROFILE_ALLOW[profile];
	return entries === '*'
		? expandPolicyEntries(['*'], tools, diagnostics, stage)
		: expandPolicyEntries(entries, tools, diagnostics, stage);
}
