import type { CronSchedulePermissionLevel } from '../cron';
import type { Permission } from '../policy';

export type AgentToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';
export type AgentToolAvailability = 'default' | 'optional' | 'legacy' | 'alias';
export type AgentCronToolPermission = `cron:${CronSchedulePermissionLevel}`;

export type AgentToolPermission =
	| Permission
	| 'execute'
	| 'state'
	| 'human'
	| 'delegate'
	| 'skill'
	| 'mcp:read'
	| 'mcp:connect'
	| 'mcp:call'
	| AgentCronToolPermission;

export type AgentToolApprovalPolicy =
	| { mode: 'none' }
	| { mode: 'workspace-boundary'; target: 'write-target' | 'workdir' }
	| { mode: 'action'; actions: readonly string[] }
	| { mode: 'always' };

export const AGENT_TOOL_APPROVAL_NONE = { mode: 'none' } as const;
export const AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY = {
	mode: 'workspace-boundary',
	target: 'write-target',
} as const;
export const AGENT_TOOL_APPROVAL_WORKDIR_BOUNDARY = {
	mode: 'workspace-boundary',
	target: 'workdir',
} as const;
export const AGENT_TOOL_APPROVAL_ALWAYS = { mode: 'always' } as const;

export const AGENT_TOOL_PROFILES = ['minimal', 'coding', 'messaging', 'standard', 'full'] as const;
export const AGENT_TOOL_STANDARD_PROFILES = ['coding', 'standard', 'full'] as const;

export const AGENT_TOOL_GROUP_METADATA = {
	'filesystem:read': {
		title: 'Filesystem read tools',
		description: 'List, read, inspect, search, diff, and resolve workspace paths.',
	},
	'filesystem:write': {
		title: 'Filesystem write tools',
		description: 'Create, overwrite, append, edit, copy, move, and patch workspace paths.',
	},
	'filesystem:delete': {
		title: 'Filesystem delete tools',
		description: 'Delete workspace files and directories.',
	},
	coreWorkspace: {
		title: 'Legacy workspace tools',
		description: 'Compatibility metadata for older workspace tool names.',
	},
	stateTask: {
		title: 'State / task tools',
		description: 'Track run-local todos, task completion, and scratch notes.',
	},
	humanDecision: {
		title: 'Human decision tools',
		description: 'Request human input, approval, authorization, or plan review.',
	},
	subagent: {
		title: 'Subagent tools',
		description: 'Delegate scoped work to a child agent.',
	},
	skill: {
		title: 'Skill tools',
		description: 'Discover, load, and apply installed agent skills.',
	},
	mcpConnector: {
		title: 'MCP connector tools',
		description: 'Discover and call Model Context Protocol servers, tools, resources, and prompts.',
	},
	script: {
		title: 'Script tools',
		description: 'Run existing workspace scripts with explicit interpreter and output limits.',
	},
	cron: {
		title: 'Cron tools',
		description: 'Create, read, update, delete, pause, resume, and run scheduled jobs.',
	},
} as const;

export type AgentToolGroupName = keyof typeof AGENT_TOOL_GROUP_METADATA;

export interface AgentToolMetadata {
	name: string;
	group: AgentToolGroupName;
	title: string;
	description: string;
	permissions: readonly AgentToolPermission[];
	approval: AgentToolApprovalPolicy;
	profiles: readonly AgentToolProfile[];
	availability: AgentToolAvailability;
	ownerOnly?: boolean;
}

const DEFAULT_TOOL_PROFILES = AGENT_TOOL_STANDARD_PROFILES;

function tool<TName extends string>(metadata: AgentToolMetadata & { name: TName }) {
	return metadata;
}

const DEFAULT_FILESYSTEM_READ_TOOLS = [
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

const DEFAULT_FILESYSTEM_WRITE_TOOLS = [
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

const DEFAULT_FILESYSTEM_DELETE_TOOLS = [
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

export const AGENT_DEFAULT_TOOL_GROUPS = {
	'filesystem:read': DEFAULT_FILESYSTEM_READ_TOOLS,
	'filesystem:write': DEFAULT_FILESYSTEM_WRITE_TOOLS,
	'filesystem:delete': DEFAULT_FILESYSTEM_DELETE_TOOLS,
	coreWorkspace: [],
	stateTask: [],
	humanDecision: [],
	subagent: [],
	skill: [],
	mcpConnector: [],
	script: [],
	cron: [],
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_TOOL_GROUPS = {
	'filesystem:read': DEFAULT_FILESYSTEM_READ_TOOLS,
	'filesystem:write': DEFAULT_FILESYSTEM_WRITE_TOOLS,
	'filesystem:delete': DEFAULT_FILESYSTEM_DELETE_TOOLS,
	coreWorkspace: [],
	stateTask: [],
	humanDecision: [],
	subagent: [],
	skill: [],
	mcpConnector: [],
	script: [],
	cron: [],
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_DEFAULT_TOOLS = [
	...AGENT_DEFAULT_TOOL_GROUPS['filesystem:read'],
	...AGENT_DEFAULT_TOOL_GROUPS['filesystem:write'],
	...AGENT_DEFAULT_TOOL_GROUPS['filesystem:delete'],
] as const;

export const AGENT_TOOLS = [
	...AGENT_TOOL_GROUPS['filesystem:read'],
	...AGENT_TOOL_GROUPS['filesystem:write'],
	...AGENT_TOOL_GROUPS['filesystem:delete'],
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number]['name'];
export type AgentDefaultToolName = (typeof AGENT_DEFAULT_TOOLS)[number]['name'];

export const AGENT_TOOL_NAMES = [
	'list_dir',
	'read_file',
	'stat_path',
	'search_files',
	'grep_files',
	'read_diff',
	'get_workspace_root',
	'resolve_path',
	'write_file',
	'append_file',
	'edit_file',
	'create_dir',
	'copy_path',
	'move_path',
	'apply_patch',
	'delete_path',
] as const satisfies readonly AgentDefaultToolName[];

export const AGENT_ALL_TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.name) as readonly AgentToolName[];

export const AGENT_TOOL_READ_ONLY_DENY_NAMES = [
	'write_file',
	'append_file',
	'edit_file',
	'create_dir',
	'copy_path',
	'move_path',
	'apply_patch',
	'delete_path',
] as const satisfies readonly AgentToolName[];

export const AGENT_TOOL_LEGACY_ALIASES = {
	list_directory: ['list_dir'],
	grep: ['grep_files'],
	git_diff: ['read_diff'],
	read: ['read_file'],
	write: ['write_file'],
	edit: ['edit_file'],
	delete: ['delete_path'],
	copy: ['copy_path'],
	move: ['move_path'],
	inspect_file: ['stat_path'],
	find: ['search_files'],
	filesystem_create: ['create_dir'],
	filesystem_read: ['read_file'],
	filesystem_update: ['write_file'],
	filesystem_list: ['list_dir'],
	filesystem_delete: ['delete_path'],
	filesystem_move: ['move_path'],
	filesystem_copy: ['copy_path'],
	filesystem_search: ['search_files'],
} as const satisfies Record<string, readonly AgentDefaultToolName[]>;

export const AGENT_TOOL_METADATA_BY_NAME = Object.fromEntries(
	AGENT_TOOLS.map((tool) => [tool.name, tool])
) as Record<AgentToolName, AgentToolMetadata>;
