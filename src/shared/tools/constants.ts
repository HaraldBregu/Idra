export * from './types';

import type { AgentToolMetadata, AgentToolGroupName } from './types';
import {
	AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
	AGENT_TOOL_FILESYSTEM_TOOLS,
} from './base';
import { AGENT_TOOL_CRON_TOOLS } from './cron';
import { AGENT_TOOL_TASK_TOOLS } from './task';

export const AGENT_DEFAULT_TOOL_GROUPS = {
	'filesystem:read': AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	'filesystem:write': AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	'filesystem:delete': AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
	coreWorkspace: [],
	humanDecision: [],
	stateTask: [],
	subagent: [],
	skill: [],
	mcpConnector: [],
	script: [],
	cron: [],
} as const satisfies Record<AgentToolGroupName, readonly AgentToolMetadata[]>;

export const AGENT_TOOL_GROUPS = {
	'filesystem:read': AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	'filesystem:write': AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	'filesystem:delete': AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
	coreWorkspace: [],
	humanDecision: [],
	stateTask: AGENT_TOOL_TASK_TOOLS,
	subagent: [],
	skill: [],
	mcpConnector: [],
	script: [],
	cron: AGENT_TOOL_CRON_TOOLS,
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
	...AGENT_TOOL_GROUPS['coreWorkspace'],
	...AGENT_TOOL_GROUPS['humanDecision'],
	...AGENT_TOOL_GROUPS['stateTask'],
	...AGENT_TOOL_GROUPS['subagent'],
	...AGENT_TOOL_GROUPS['skill'],
	...AGENT_TOOL_GROUPS['mcpConnector'],
	...AGENT_TOOL_GROUPS['script'],
	...AGENT_TOOL_GROUPS['cron'],
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

export { AGENT_TOOL_FILESYSTEM_TOOLS as AGENT_TOOL_FILESYSTEM_TOOLS_SET };
