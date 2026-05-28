import type { AgentToolMetadata } from './types';
import {
	AGENT_TOOL_APPROVAL_NONE,
	AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
	AGENT_TOOL_STANDARD_PROFILES,
} from './types';

const DEFAULT_TOOL_PROFILES = AGENT_TOOL_STANDARD_PROFILES;

function tool<TName extends string>(metadata: AgentToolMetadata & { name: TName }) {
	return metadata;
}

export const AGENT_TOOL_FILESYSTEM_READ_TOOLS = [
	tool({
		name: 'list_dir',
		group: 'filesystem:read',
		title: 'List directory',
		description: 'List files and directories under a workspace path.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'read_file',
		group: 'filesystem:read',
		title: 'Read file',
		description: 'Read a UTF-8 workspace file with optional line offset and limit.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'stat_path',
		group: 'filesystem:read',
		title: 'Stat path',
		description: 'Return metadata for a workspace path.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'search_files',
		group: 'filesystem:read',
		title: 'Search files',
		description: 'Find workspace paths by name, substring, or wildcard pattern.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'grep_files',
		group: 'filesystem:read',
		title: 'Grep files',
		description: 'Search UTF-8 workspace file contents.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'read_diff',
		group: 'filesystem:read',
		title: 'Read diff',
		description: 'Read Git diff output for workspace changes.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'get_workspace_root',
		group: 'filesystem:read',
		title: 'Get workspace root',
		description: 'Return the absolute workspace root.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'resolve_path',
		group: 'filesystem:read',
		title: 'Resolve path',
		description: 'Resolve a workspace-relative path and report whether it exists.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

export const AGENT_TOOL_FILESYSTEM_WRITE_TOOLS = [
	tool({
		name: 'write_file',
		group: 'filesystem:write',
		title: 'Write file',
		description: 'Create or overwrite a UTF-8 workspace file.',
		permissions: ['create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'append_file',
		group: 'filesystem:write',
		title: 'Append file',
		description: 'Append UTF-8 text to a workspace file.',
		permissions: ['create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'edit_file',
		group: 'filesystem:write',
		title: 'Edit file',
		description: 'Replace exact text in a UTF-8 workspace file.',
		permissions: ['write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'create_dir',
		group: 'filesystem:write',
		title: 'Create directory',
		description: 'Create a workspace directory.',
		permissions: ['create'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'copy_path',
		group: 'filesystem:write',
		title: 'Copy path',
		description: 'Copy a file or directory within the workspace.',
		permissions: ['read', 'create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'move_path',
		group: 'filesystem:write',
		title: 'Move path',
		description: 'Move or rename a workspace path.',
		permissions: ['read', 'delete', 'create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'apply_patch',
		group: 'filesystem:write',
		title: 'Apply patch',
		description: 'Apply a unified diff to workspace files.',
		permissions: ['create', 'write', 'delete'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

export const AGENT_TOOL_FILESYSTEM_DELETE_TOOLS = [
	tool({
		name: 'delete_path',
		group: 'filesystem:delete',
		title: 'Delete path',
		description: 'Delete a workspace file or directory.',
		permissions: ['delete'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

export const AGENT_TOOL_FILESYSTEM_TOOLS = [
	...AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	...AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	...AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
] as const;
