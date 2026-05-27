export const AGENT_TOOL_GROUPS = {
	coreWorkspace: [
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
	],
	stateTask: [
		'write_todos',
		'update_todo',
		'list_todos',
		'complete_task',
		'write_scratch',
		'read_scratch',
	],
	humanDecision: [
		'request_approval',
		'request_clarification',
		'present_plan',
		'request_authorization',
	],
	subagent: ['spawn_subagent'],
	skill: ['list_skills', 'load_skill', 'use_skill'],
	mcpConnector: [
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
	],
} as const;

export const AGENT_TOOL_NAMES = [
	...AGENT_TOOL_GROUPS.coreWorkspace,
	...AGENT_TOOL_GROUPS.stateTask,
	...AGENT_TOOL_GROUPS.humanDecision,
	...AGENT_TOOL_GROUPS.subagent,
	...AGENT_TOOL_GROUPS.skill,
	...AGENT_TOOL_GROUPS.mcpConnector,
] as const;

export type AgentToolGroupName = keyof typeof AGENT_TOOL_GROUPS;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];
