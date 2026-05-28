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

export const AGENT_ALL_TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.name) as readonly AgentToolName[];
