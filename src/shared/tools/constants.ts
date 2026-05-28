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
const OPTIONAL_TOOL_PROFILES = ['full'] as const satisfies readonly AgentToolProfile[];
const LEGACY_TOOL_PROFILES = [] as const satisfies readonly AgentToolProfile[];

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

const DEFAULT_STATE_TASK_TOOLS = [
	tool({
		name: 'write_todos',
		group: 'stateTask',
		title: 'Write todos',
		description: 'Replace the current run todo list.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'update_todo',
		group: 'stateTask',
		title: 'Update todo',
		description: 'Update one item in the current run todo list.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'list_todos',
		group: 'stateTask',
		title: 'List todos',
		description: 'List the current run todo items and statuses.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'complete_task',
		group: 'stateTask',
		title: 'Complete task',
		description: 'Mark the current task or a todo item as complete.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'write_scratch',
		group: 'stateTask',
		title: 'Write scratch',
		description: 'Write run-local scratch notes for later tool calls.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'read_scratch',
		group: 'stateTask',
		title: 'Read scratch',
		description: 'Read run-local scratch notes.',
		permissions: ['state'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

const DEFAULT_HUMAN_DECISION_TOOLS = [
	tool({
		name: 'request_approval',
		group: 'humanDecision',
		title: 'Request approval',
		description: 'Ask a human to approve or deny a proposed action.',
		permissions: ['human'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'request_clarification',
		group: 'humanDecision',
		title: 'Request clarification',
		description: 'Ask a focused clarification question before continuing.',
		permissions: ['human'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'present_plan',
		group: 'humanDecision',
		title: 'Present plan',
		description: 'Present a plan for human review before taking action.',
		permissions: ['human'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'request_authorization',
		group: 'humanDecision',
		title: 'Request authorization',
		description: 'Request explicit authorization for sensitive or external actions.',
		permissions: ['human'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

const DEFAULT_SUBAGENT_TOOLS = [
	tool({
		name: 'spawn_subagent',
		group: 'subagent',
		title: 'Spawn subagent',
		description: 'Start a child agent run for a clearly scoped task.',
		permissions: ['delegate'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

const DEFAULT_SKILL_TOOLS = [
	tool({
		name: 'list_skills',
		group: 'skill',
		title: 'List skills',
		description: 'List installed skills available to the agent.',
		permissions: ['skill'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'load_skill',
		group: 'skill',
		title: 'Load skill',
		description: 'Load instructions and support file metadata for an installed skill.',
		permissions: ['skill'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'use_skill',
		group: 'skill',
		title: 'Use skill',
		description: 'Select and load a skill for the current task.',
		permissions: ['skill'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

const DEFAULT_MCP_CONNECTOR_TOOLS = [
	tool({
		name: 'list_mcp_servers',
		group: 'mcpConnector',
		title: 'List MCP servers',
		description: 'List configured MCP connector servers.',
		permissions: ['mcp:read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'connect_mcp_server',
		group: 'mcpConnector',
		title: 'Connect MCP server',
		description: 'Connect to or test a configured MCP server.',
		permissions: ['mcp:connect'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'refresh_mcp_server',
		group: 'mcpConnector',
		title: 'Refresh MCP server',
		description: 'Refresh a configured MCP server and its discovered capabilities.',
		permissions: ['mcp:connect'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'list_mcp_tools',
		group: 'mcpConnector',
		title: 'List MCP tools',
		description: 'List tools exposed by a configured MCP server.',
		permissions: ['mcp:read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'load_mcp_tool',
		group: 'mcpConnector',
		title: 'Load MCP tool',
		description: 'Load schema and metadata for one MCP tool.',
		permissions: ['mcp:read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'call_mcp_tool',
		group: 'mcpConnector',
		title: 'Call MCP tool',
		description: 'Call a tool on a configured MCP server.',
		permissions: ['mcp:call'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'list_mcp_resources',
		group: 'mcpConnector',
		title: 'List MCP resources',
		description: 'List resources exposed by a configured MCP server.',
		permissions: ['mcp:read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'read_mcp_resource',
		group: 'mcpConnector',
		title: 'Read MCP resource',
		description: 'Read a resource from a configured MCP server.',
		permissions: ['mcp:read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'list_mcp_prompts',
		group: 'mcpConnector',
		title: 'List MCP prompts',
		description: 'List prompts exposed by a configured MCP server.',
		permissions: ['mcp:read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'load_mcp_prompt',
		group: 'mcpConnector',
		title: 'Load MCP prompt',
		description: 'Load a prompt from a configured MCP server.',
		permissions: ['mcp:read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

const OPTIONAL_SCRIPT_TOOLS = [
	tool({
		name: 'script_run',
		group: 'script',
		title: 'Run script',
		description: 'Run an existing script file with explicit args and output limits.',
		permissions: ['read', 'write', 'execute'],
		approval: AGENT_TOOL_APPROVAL_WORKDIR_BOUNDARY,
		profiles: OPTIONAL_TOOL_PROFILES,
		availability: 'optional',
	}),
] as const;

const DEFAULT_CRON_TOOLS = [
	tool({
		name: 'cron_create',
		group: 'cron',
		title: 'Create cron schedule',
		description: 'Create a scheduled job through CronService.',
		permissions: ['cron:createSchedule'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'cron_read',
		group: 'cron',
		title: 'Read cron schedule',
		description: 'Read a scheduled job through CronService.',
		permissions: ['cron:scheduleReadPrivateData'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'cron_update',
		group: 'cron',
		title: 'Update cron schedule',
		description: 'Update a scheduled job through CronService.',
		permissions: ['cron:updateSchedule'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'cron_delete',
		group: 'cron',
		title: 'Delete cron schedule',
		description: 'Delete a scheduled job through CronService.',
		permissions: ['cron:deleteSchedule'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'cron_list',
		group: 'cron',
		title: 'List cron schedules',
		description: 'List scheduled jobs through CronService.',
		permissions: ['cron:listSchedules'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'cron_start',
		group: 'cron',
		title: 'Start cron schedule',
		description: 'Start a paused scheduled job through CronService.',
		permissions: ['cron:resumeSchedule'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'cron_stop',
		group: 'cron',
		title: 'Stop cron schedule',
		description: 'Stop a scheduled job through CronService.',
		permissions: ['cron:pauseSchedule'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
	tool({
		name: 'cron_run',
		group: 'cron',
		title: 'Run cron schedule now',
		description: 'Run a scheduled job immediately through CronService.',
		permissions: ['cron:runScheduleNow'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: DEFAULT_TOOL_PROFILES,
		availability: 'default',
	}),
] as const;

const LEGACY_CORE_WORKSPACE_TOOLS = [
	tool({
		name: 'list_directory',
		group: 'coreWorkspace',
		title: 'List directory',
		description: 'Legacy directory listing alias for list_dir.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'grep',
		group: 'coreWorkspace',
		title: 'Grep',
		description: 'Legacy content search alias for grep_files.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'run_shell',
		group: 'coreWorkspace',
		title: 'Run shell',
		description: 'Legacy shell command tool.',
		permissions: ['read', 'write', 'execute'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'git_status',
		group: 'coreWorkspace',
		title: 'Git status',
		description: 'Legacy Git status tool.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'git_diff',
		group: 'coreWorkspace',
		title: 'Git diff',
		description: 'Legacy Git diff alias for read_diff.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'undo_last_operation',
		group: 'coreWorkspace',
		title: 'Undo last operation',
		description: 'Legacy reversible workspace operation undo tool.',
		permissions: ['write', 'delete'],
		approval: AGENT_TOOL_APPROVAL_ALWAYS,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'read',
		group: 'coreWorkspace',
		title: 'Read',
		description: 'Legacy file reader alias for read_file.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'write',
		group: 'coreWorkspace',
		title: 'Write',
		description: 'Legacy file writer alias for write_file.',
		permissions: ['create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'edit',
		group: 'coreWorkspace',
		title: 'Edit',
		description: 'Legacy exact-string file edit alias for edit_file.',
		permissions: ['write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'delete',
		group: 'coreWorkspace',
		title: 'Delete',
		description: 'Delete a file or directory after policy and read-before-delete checks.',
		permissions: ['delete'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'copy',
		group: 'coreWorkspace',
		title: 'Copy',
		description: 'Copy one file or directory to another path.',
		permissions: ['read', 'create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'move',
		group: 'coreWorkspace',
		title: 'Move',
		description: 'Move or rename one file after policy and read-before-write checks.',
		permissions: ['read', 'delete', 'create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'inspect_file',
		group: 'coreWorkspace',
		title: 'Inspect file',
		description: 'Inspect any file as bytes, including size, type, hash, and previews.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'find',
		group: 'coreWorkspace',
		title: 'Find',
		description: 'Find files by glob pattern.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'filesystem_create',
		group: 'coreWorkspace',
		title: 'Filesystem create',
		description: 'Create a file or directory through the legacy filesystem API.',
		permissions: ['create'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
	tool({
		name: 'filesystem_list',
		group: 'coreWorkspace',
		title: 'Filesystem list',
		description: 'List directory entries through the legacy filesystem API.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'legacy',
	}),
] as const;

const ALIAS_CORE_WORKSPACE_TOOLS = [
	tool({
		name: 'filesystem_read',
		group: 'coreWorkspace',
		title: 'Filesystem read',
		description: 'Alias for the legacy read tool.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'alias',
	}),
	tool({
		name: 'filesystem_update',
		group: 'coreWorkspace',
		title: 'Filesystem update',
		description: 'Alias for the legacy write tool.',
		permissions: ['create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'alias',
	}),
	tool({
		name: 'filesystem_delete',
		group: 'coreWorkspace',
		title: 'Filesystem delete',
		description: 'Alias for the legacy delete tool.',
		permissions: ['delete'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'alias',
	}),
	tool({
		name: 'filesystem_move',
		group: 'coreWorkspace',
		title: 'Filesystem move',
		description: 'Alias for the legacy move tool.',
		permissions: ['read', 'delete', 'create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'alias',
	}),
	tool({
		name: 'filesystem_copy',
		group: 'coreWorkspace',
		title: 'Filesystem copy',
		description: 'Alias for the legacy copy tool.',
		permissions: ['read', 'create', 'write'],
		approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'alias',
	}),
	tool({
		name: 'filesystem_search',
		group: 'coreWorkspace',
		title: 'Filesystem search',
		description: 'Alias for the legacy find tool.',
		permissions: ['read'],
		approval: AGENT_TOOL_APPROVAL_NONE,
		profiles: LEGACY_TOOL_PROFILES,
		availability: 'alias',
	}),
] as const;

export const AGENT_DEFAULT_TOOL_GROUPS = {
	'filesystem:read': DEFAULT_FILESYSTEM_READ_TOOLS,
	'filesystem:write': DEFAULT_FILESYSTEM_WRITE_TOOLS,
	'filesystem:delete': DEFAULT_FILESYSTEM_DELETE_TOOLS,
	coreWorkspace: [],
	stateTask: DEFAULT_STATE_TASK_TOOLS,
	humanDecision: DEFAULT_HUMAN_DECISION_TOOLS,
	subagent: DEFAULT_SUBAGENT_TOOLS,
	skill: DEFAULT_SKILL_TOOLS,
	mcpConnector: DEFAULT_MCP_CONNECTOR_TOOLS,
	script: [],
	cron: DEFAULT_CRON_TOOLS,
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_TOOL_GROUPS = {
	'filesystem:read': DEFAULT_FILESYSTEM_READ_TOOLS,
	'filesystem:write': DEFAULT_FILESYSTEM_WRITE_TOOLS,
	'filesystem:delete': DEFAULT_FILESYSTEM_DELETE_TOOLS,
	coreWorkspace: [
		...LEGACY_CORE_WORKSPACE_TOOLS,
		...ALIAS_CORE_WORKSPACE_TOOLS,
	],
	stateTask: DEFAULT_STATE_TASK_TOOLS,
	humanDecision: DEFAULT_HUMAN_DECISION_TOOLS,
	subagent: DEFAULT_SUBAGENT_TOOLS,
	skill: DEFAULT_SKILL_TOOLS,
	mcpConnector: DEFAULT_MCP_CONNECTOR_TOOLS,
	script: OPTIONAL_SCRIPT_TOOLS,
	cron: DEFAULT_CRON_TOOLS,
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_DEFAULT_TOOLS = [
	...AGENT_DEFAULT_TOOL_GROUPS['filesystem:read'],
	...AGENT_DEFAULT_TOOL_GROUPS['filesystem:write'],
	...AGENT_DEFAULT_TOOL_GROUPS['filesystem:delete'],
	...AGENT_DEFAULT_TOOL_GROUPS.coreWorkspace,
	...AGENT_DEFAULT_TOOL_GROUPS.stateTask,
	...AGENT_DEFAULT_TOOL_GROUPS.humanDecision,
	...AGENT_DEFAULT_TOOL_GROUPS.subagent,
	...AGENT_DEFAULT_TOOL_GROUPS.skill,
	...AGENT_DEFAULT_TOOL_GROUPS.mcpConnector,
	...AGENT_DEFAULT_TOOL_GROUPS.cron,
] as const;

export const AGENT_TOOLS = [
	...AGENT_TOOL_GROUPS['filesystem:read'],
	...AGENT_TOOL_GROUPS['filesystem:write'],
	...AGENT_TOOL_GROUPS['filesystem:delete'],
	...AGENT_TOOL_GROUPS.coreWorkspace,
	...AGENT_TOOL_GROUPS.stateTask,
	...AGENT_TOOL_GROUPS.humanDecision,
	...AGENT_TOOL_GROUPS.subagent,
	...AGENT_TOOL_GROUPS.skill,
	...AGENT_TOOL_GROUPS.mcpConnector,
	...AGENT_TOOL_GROUPS.script,
	...AGENT_TOOL_GROUPS.cron,
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
	'write_todos',
	'update_todo',
	'list_todos',
	'complete_task',
	'write_scratch',
	'read_scratch',
	'request_approval',
	'request_clarification',
	'present_plan',
	'request_authorization',
	'spawn_subagent',
	'list_skills',
	'load_skill',
	'use_skill',
	'list_mcp_servers',
	'connect_mcp_server',
	'refresh_mcp_server',
	'list_mcp_tools',
	'load_mcp_tool',
	'call_mcp_tool',
	'list_mcp_resources',
	'read_mcp_resource',
	'list_mcp_prompts',
	'load_mcp_prompt',
	'cron_create',
	'cron_read',
	'cron_update',
	'cron_delete',
	'cron_list',
	'cron_start',
	'cron_stop',
	'cron_run',
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
	'run_shell',
	'undo_last_operation',
	'connect_mcp_server',
	'refresh_mcp_server',
	'call_mcp_tool',
	'script_run',
	'cron_create',
	'cron_update',
	'cron_delete',
	'cron_start',
	'cron_stop',
	'cron_run',
	'write',
	'edit',
	'apply_patch',
	'delete',
	'copy',
	'move',
	'filesystem_create',
	'filesystem_update',
	'filesystem_delete',
	'filesystem_move',
	'filesystem_copy',
] as const satisfies readonly AgentToolName[];

export const AGENT_TOOL_LEGACY_ALIASES = {
	read: ['read_file'],
	write: ['write_file'],
	edit: ['edit_file'],
	find: ['search_files'],
	filesystem_read: ['read_file'],
	filesystem_update: ['write_file'],
	filesystem_list: ['list_directory'],
	filesystem_search: ['search_files'],
	script_run: ['run_shell'],
	sessions_spawn: ['spawn_subagent'],
} as const satisfies Record<string, readonly AgentDefaultToolName[]>;

export const AGENT_TOOL_METADATA_BY_NAME = Object.fromEntries(
	AGENT_TOOLS.map((tool) => [tool.name, tool])
) as Record<AgentToolName, AgentToolMetadata>;
