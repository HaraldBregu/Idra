import { defineAgentTools } from './types';

export const AGENT_TOOL_FILESYSTEM_READ_TOOLS = defineAgentTools([
	{
		name: 'list_dir',
		label: 'List directory',
		description: 'List files and directories under a workspace path.',
	},
	{
		name: 'read_file',
		label: 'Read file',
		description: 'Read a UTF-8 workspace file with optional line offset and limit.',
	},
	{
		name: 'stat_path',
		label: 'Stat path',
		description: 'Return metadata for a workspace path.',
	},
	{
		name: 'search_files',
		label: 'Search files',
		description: 'Find workspace paths by name, substring, or wildcard pattern.',
	},
	{
		name: 'grep_files',
		label: 'Grep files',
		description: 'Search UTF-8 workspace file contents.',
	},
	{
		name: 'read_diff',
		label: 'Read diff',
		description: 'Read Git diff output for workspace changes.',
	},
	{
		name: 'get_workspace_root',
		label: 'Get workspace root',
		description: 'Return the absolute workspace root.',
	},
	{
		name: 'resolve_path',
		label: 'Resolve path',
		description: 'Resolve a workspace-relative path and report whether it exists.',
	},
]);

export const AGENT_TOOL_FILESYSTEM_WRITE_TOOLS = defineAgentTools([
	{
		name: 'write_file',
		label: 'Write file',
		description: 'Create or overwrite a UTF-8 workspace file.',
	},
	{
		name: 'append_file',
		label: 'Append file',
		description: 'Append UTF-8 text to a workspace file.',
	},
	{
		name: 'edit_file',
		label: 'Edit file',
		description: 'Replace exact text in a UTF-8 workspace file.',
	},
	{
		name: 'create_dir',
		label: 'Create directory',
		description: 'Create a workspace directory.',
	},
	{
		name: 'copy_path',
		label: 'Copy path',
		description: 'Copy a file or directory within the workspace.',
	},
	{
		name: 'move_path',
		label: 'Move path',
		description: 'Move or rename a workspace path.',
	},
	{
		name: 'apply_patch',
		label: 'Apply patch',
		description: 'Apply a unified diff to workspace files.',
	},
]);

export const AGENT_TOOL_FILESYSTEM_DELETE_TOOLS = defineAgentTools([
	{
		name: 'delete_path',
		label: 'Delete path',
		description: 'Delete a workspace file or directory.',
	},
]);

export const AGENT_TOOL_FILESYSTEM_TOOLS = [
	...AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	...AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	...AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
] as const;
