import type { Permission } from '../policy';

export type AgentToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';

export type AgentToolPermission =
	| Permission
	| 'execute'
	| 'state'
	| 'human'
	| 'delegate'
	| 'skill'
	| 'mcp:read'
	| 'mcp:connect'
	| 'mcp:call';

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
export const AGENT_TOOL_APPROVAL_ALWAYS = { mode: 'always' } as const;

export const AGENT_TOOL_STANDARD_PROFILES = ['coding', 'standard', 'full'] as const;

export const AGENT_TOOL_GROUP_METADATA = {
	coreWorkspace: {
		title: 'Core workspace tools',
		description: 'Read, write, search, inspect, and run commands inside a workspace.',
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
} as const;

export type AgentToolGroupName = keyof typeof AGENT_TOOL_GROUP_METADATA;

export interface AgentToolMetadata {
	name: string;
	group: AgentToolGroupName;
	title: string;
	description: string;
	permissions: readonly AgentToolPermission[];
	approval: AgentToolApprovalPolicy;
}

export const AGENT_TOOL_GROUPS = {
	coreWorkspace: [
		{
			name: 'read_file',
			group: 'coreWorkspace',
			title: 'Read file',
			description: 'Read a UTF-8 workspace file with optional line offset and limit.',
			permissions: ['read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'write_file',
			group: 'coreWorkspace',
			title: 'Write file',
			description: 'Create or overwrite a UTF-8 workspace file.',
			permissions: ['create', 'write'],
			approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		},
		{
			name: 'edit_file',
			group: 'coreWorkspace',
			title: 'Edit file',
			description: 'Replace exact text in a UTF-8 workspace file.',
			permissions: ['write'],
			approval: AGENT_TOOL_APPROVAL_WRITE_WORKSPACE_BOUNDARY,
		},
		{
			name: 'list_directory',
			group: 'coreWorkspace',
			title: 'List directory',
			description: 'List files and folders in a workspace directory.',
			permissions: ['read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'search_files',
			group: 'coreWorkspace',
			title: 'Search files',
			description: 'Find workspace paths by glob pattern.',
			permissions: ['read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'grep',
			group: 'coreWorkspace',
			title: 'Grep',
			description: 'Search workspace file contents for text or regular expression matches.',
			permissions: ['read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'run_shell',
			group: 'coreWorkspace',
			title: 'Run shell',
			description: 'Run a shell command in the workspace with captured output.',
			permissions: ['read', 'write', 'execute'],
			approval: AGENT_TOOL_APPROVAL_ALWAYS,
		},
		{
			name: 'git_status',
			group: 'coreWorkspace',
			title: 'Git status',
			description: 'Show the current Git working tree status.',
			permissions: ['read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'git_diff',
			group: 'coreWorkspace',
			title: 'Git diff',
			description: 'Show Git diffs for tracked workspace changes.',
			permissions: ['read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'undo_last_operation',
			group: 'coreWorkspace',
			title: 'Undo last operation',
			description: 'Undo the most recent reversible workspace tool operation.',
			permissions: ['write', 'delete'],
			approval: AGENT_TOOL_APPROVAL_ALWAYS,
		},
	],
	stateTask: [
		{
			name: 'write_todos',
			group: 'stateTask',
			title: 'Write todos',
			description: 'Replace the current run todo list.',
			permissions: ['state'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'update_todo',
			group: 'stateTask',
			title: 'Update todo',
			description: 'Update one item in the current run todo list.',
			permissions: ['state'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'list_todos',
			group: 'stateTask',
			title: 'List todos',
			description: 'List the current run todo items and statuses.',
			permissions: ['state'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'complete_task',
			group: 'stateTask',
			title: 'Complete task',
			description: 'Mark the current task or a todo item as complete.',
			permissions: ['state'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'write_scratch',
			group: 'stateTask',
			title: 'Write scratch',
			description: 'Write run-local scratch notes for later tool calls.',
			permissions: ['state'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'read_scratch',
			group: 'stateTask',
			title: 'Read scratch',
			description: 'Read run-local scratch notes.',
			permissions: ['state'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
	],
	humanDecision: [
		{
			name: 'request_approval',
			group: 'humanDecision',
			title: 'Request approval',
			description: 'Ask a human to approve or deny a proposed action.',
			permissions: ['human'],
			approval: AGENT_TOOL_APPROVAL_ALWAYS,
		},
		{
			name: 'request_clarification',
			group: 'humanDecision',
			title: 'Request clarification',
			description: 'Ask a focused clarification question before continuing.',
			permissions: ['human'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'present_plan',
			group: 'humanDecision',
			title: 'Present plan',
			description: 'Present a plan for human review before taking action.',
			permissions: ['human'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'request_authorization',
			group: 'humanDecision',
			title: 'Request authorization',
			description: 'Request explicit authorization for sensitive or external actions.',
			permissions: ['human'],
			approval: AGENT_TOOL_APPROVAL_ALWAYS,
		},
	],
	subagent: [
		{
			name: 'spawn_subagent',
			group: 'subagent',
			title: 'Spawn subagent',
			description: 'Start a child agent run for a clearly scoped task.',
			permissions: ['delegate'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
	],
	skill: [
		{
			name: 'list_skills',
			group: 'skill',
			title: 'List skills',
			description: 'List installed skills available to the agent.',
			permissions: ['skill'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'load_skill',
			group: 'skill',
			title: 'Load skill',
			description: 'Load instructions and support file metadata for an installed skill.',
			permissions: ['skill'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'use_skill',
			group: 'skill',
			title: 'Use skill',
			description: 'Select and load a skill for the current task.',
			permissions: ['skill'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
	],
	mcpConnector: [
		{
			name: 'list_mcp_servers',
			group: 'mcpConnector',
			title: 'List MCP servers',
			description: 'List configured MCP connector servers.',
			permissions: ['mcp:read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'connect_mcp_server',
			group: 'mcpConnector',
			title: 'Connect MCP server',
			description: 'Connect to or test a configured MCP server.',
			permissions: ['mcp:connect'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'refresh_mcp_server',
			group: 'mcpConnector',
			title: 'Refresh MCP server',
			description: 'Refresh a configured MCP server and its discovered capabilities.',
			permissions: ['mcp:connect'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'list_mcp_tools',
			group: 'mcpConnector',
			title: 'List MCP tools',
			description: 'List tools exposed by a configured MCP server.',
			permissions: ['mcp:read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'load_mcp_tool',
			group: 'mcpConnector',
			title: 'Load MCP tool',
			description: 'Load schema and metadata for one MCP tool.',
			permissions: ['mcp:read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'call_mcp_tool',
			group: 'mcpConnector',
			title: 'Call MCP tool',
			description: 'Call a tool on a configured MCP server.',
			permissions: ['mcp:call'],
			approval: AGENT_TOOL_APPROVAL_ALWAYS,
		},
		{
			name: 'list_mcp_resources',
			group: 'mcpConnector',
			title: 'List MCP resources',
			description: 'List resources exposed by a configured MCP server.',
			permissions: ['mcp:read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'read_mcp_resource',
			group: 'mcpConnector',
			title: 'Read MCP resource',
			description: 'Read a resource from a configured MCP server.',
			permissions: ['mcp:read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'list_mcp_prompts',
			group: 'mcpConnector',
			title: 'List MCP prompts',
			description: 'List prompts exposed by a configured MCP server.',
			permissions: ['mcp:read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
		{
			name: 'load_mcp_prompt',
			group: 'mcpConnector',
			title: 'Load MCP prompt',
			description: 'Load a prompt from a configured MCP server.',
			permissions: ['mcp:read'],
			approval: AGENT_TOOL_APPROVAL_NONE,
		},
	],
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_TOOLS = [
	...AGENT_TOOL_GROUPS.coreWorkspace,
	...AGENT_TOOL_GROUPS.stateTask,
	...AGENT_TOOL_GROUPS.humanDecision,
	...AGENT_TOOL_GROUPS.subagent,
	...AGENT_TOOL_GROUPS.skill,
	...AGENT_TOOL_GROUPS.mcpConnector,
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number]['name'];

export const AGENT_TOOL_NAMES = [
	'read_file',
	'write_file',
	'edit_file',
	'list_directory',
	'search_files',
	'grep',
	'run_shell',
	'git_status',
	'git_diff',
	'undo_last_operation',
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
] as const satisfies readonly AgentToolName[];

export const AGENT_TOOL_READ_ONLY_DENY_NAMES = [
	'write_file',
	'edit_file',
	'run_shell',
	'undo_last_operation',
	'connect_mcp_server',
	'refresh_mcp_server',
	'call_mcp_tool',
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
} as const satisfies Record<string, readonly AgentToolName[]>;

export const AGENT_TOOL_METADATA_BY_NAME = Object.fromEntries(
	AGENT_TOOLS.map((tool) => [tool.name, tool])
) as unknown as Record<AgentToolName, AgentToolMetadata>;
