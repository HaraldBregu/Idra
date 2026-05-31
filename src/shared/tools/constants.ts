import {
	DEFAULT_CORE_WORKSPACE_TOOLS,
	DEFAULT_HUMAN_DECISION_TOOLS,
	DEFAULT_MCP_CONNECTOR_TOOLS,
	DEFAULT_SKILL_TOOLS,
	DEFAULT_STATE_TASK_TOOLS,
	DEFAULT_SUBAGENT_TOOLS,
	LEGACY_CORE_WORKSPACE_TOOLS,
	OPTIONAL_CRON_TOOLS,
	OPTIONAL_SCRIPT_TOOLS,
} from './catalog';
import type { AgentToolMetadata } from './types';
import type { AgentToolGroupName } from './groups';

export * from './catalog';
export * from './groups';
export * from './policy';
export * from './profiles';
export * from './types';

export const AGENT_DEFAULT_TOOL_GROUPS = {
	coreWorkspace: DEFAULT_CORE_WORKSPACE_TOOLS,
	stateTask: DEFAULT_STATE_TASK_TOOLS,
	humanDecision: DEFAULT_HUMAN_DECISION_TOOLS,
	subagent: DEFAULT_SUBAGENT_TOOLS,
	skill: DEFAULT_SKILL_TOOLS,
	mcpConnector: DEFAULT_MCP_CONNECTOR_TOOLS,
	web: [],
	script: [],
	cron: [],
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_TOOL_GROUPS = {
	coreWorkspace: [...DEFAULT_CORE_WORKSPACE_TOOLS, ...LEGACY_CORE_WORKSPACE_TOOLS],
	stateTask: DEFAULT_STATE_TASK_TOOLS,
	humanDecision: DEFAULT_HUMAN_DECISION_TOOLS,
	subagent: DEFAULT_SUBAGENT_TOOLS,
	skill: DEFAULT_SKILL_TOOLS,
	mcpConnector: DEFAULT_MCP_CONNECTOR_TOOLS,
	web: [],
	script: OPTIONAL_SCRIPT_TOOLS,
	cron: OPTIONAL_CRON_TOOLS,
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_DEFAULT_TOOLS = [
	...AGENT_DEFAULT_TOOL_GROUPS.coreWorkspace,
	...AGENT_DEFAULT_TOOL_GROUPS.stateTask,
	...AGENT_DEFAULT_TOOL_GROUPS.humanDecision,
	...AGENT_DEFAULT_TOOL_GROUPS.subagent,
	...AGENT_DEFAULT_TOOL_GROUPS.skill,
	...AGENT_DEFAULT_TOOL_GROUPS.mcpConnector,
] as const;

export const AGENT_TOOLS = [
	...AGENT_TOOL_GROUPS.coreWorkspace,
	...AGENT_TOOL_GROUPS.stateTask,
	...AGENT_TOOL_GROUPS.humanDecision,
	...AGENT_TOOL_GROUPS.subagent,
	...AGENT_TOOL_GROUPS.skill,
	...AGENT_TOOL_GROUPS.mcpConnector,
	...AGENT_TOOL_GROUPS.web,
	...AGENT_TOOL_GROUPS.script,
	...AGENT_TOOL_GROUPS.cron,
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number]['name'];
export type AgentDefaultToolName = (typeof AGENT_DEFAULT_TOOLS)[number]['name'];

export const AGENT_TOOL_NAMES = [
	'read_file',
	'edit_file',
	'list_directory',
	'search_files',
	'grep',
	'run_shell',
	'undo_last_operation',
	'write',
	'write_todos',
	'update_todo',
	'list_todos',
	'complete_task',
	'start_task',
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
] as const satisfies readonly AgentDefaultToolName[];

export const AGENT_ALL_TOOL_NAMES = AGENT_TOOLS.map(
	(tool) => tool.name
) as readonly AgentToolName[];

export const AGENT_TOOL_READ_ONLY_DENY_NAMES = [
	'edit_file',
	'run_shell',
	'undo_last_operation',
	'start_task',
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
	'apply_patch',
	'delete_file',
	'copy',
	'move',
] as const satisfies readonly AgentToolName[];

export const AGENT_TOOL_LEGACY_ALIASES = {
	script_run: ['run_shell'],
	sessions_spawn: ['spawn_subagent'],
} as const satisfies Record<string, readonly AgentDefaultToolName[]>;

export const AGENT_TOOL_METADATA_BY_NAME = Object.fromEntries(
	AGENT_TOOLS.map((tool) => [tool.name, tool])
) as unknown as Record<AgentToolName, AgentToolMetadata>;
