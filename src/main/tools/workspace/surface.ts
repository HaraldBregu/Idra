import { normalizeToolName } from '../base/common';

export const WORKSPACE_TOOL_NAME = 'workspace';

const WORKSPACE_STANDALONE_TOOL_NAMES = new Set([
	'file_read',
	'file_edit',
	'directory_list',
	'search_files',
	'file_write',
	'file_delete',
	'apply_patch',
	'copy',
	'move',
]);

const WORKSPACE_GROUP_PREFIXES = ['group:file', 'group:filesystem', 'group:core'];

export function collapseWorkspaceToolSurface<TTool extends { name: string }>(
	tools: TTool[],
	options: { explicitAllow?: readonly string[]; readOnly?: boolean } = {}
): TTool[] {
	if (!tools.some((tool) => normalizeToolName(tool.name) === WORKSPACE_TOOL_NAME)) return tools;
	if (options.readOnly) {
		return tools.filter((tool) => normalizeToolName(tool.name) !== WORKSPACE_TOOL_NAME);
	}
	if (requestsStandaloneWorkspaceTools(options.explicitAllow)) return tools;
	return tools.filter((tool) => !WORKSPACE_STANDALONE_TOOL_NAMES.has(normalizeToolName(tool.name)));
}

function requestsStandaloneWorkspaceTools(entries: readonly string[] | undefined): boolean {
	if (!entries?.length) return false;
	return entries.some((entry) => {
		const normalized = normalizeToolName(entry);
		return (
			normalized === '*' ||
			WORKSPACE_STANDALONE_TOOL_NAMES.has(normalized) ||
			WORKSPACE_GROUP_PREFIXES.some((prefix) => normalized.startsWith(prefix))
		);
	});
}
