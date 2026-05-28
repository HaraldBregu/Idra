export * from './types';

import {
	AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
} from './base';
import { AGENT_TOOL_CRON_TOOLS } from './cron';
import { AGENT_TOOL_TASK_TOOLS } from './task';

export const AGENT_DEFAULT_TOOLS = [
	...AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	...AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	...AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
] as const;

export const AGENT_TOOLS = [
	...AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	...AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	...AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
	...AGENT_TOOL_TASK_TOOLS,
	...AGENT_TOOL_CRON_TOOLS,
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
