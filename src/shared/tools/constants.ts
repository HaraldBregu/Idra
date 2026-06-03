import { AGENT_TOOLS } from './catalog';
import type { AgentToolGroupName, AgentToolMetadata, AgentToolProfile } from './types';

export * from './catalog';
export * from './policy';
export type { AgentToolGroupName, AgentToolProfile };

type AgentTool = (typeof AGENT_TOOLS)[number];
type AgentToolAvailability = AgentTool['availability'];
type AgentToolByAvailability<TAvailability extends AgentToolAvailability> = Extract<
	AgentTool,
	{ availability: TAvailability }
>;

const AGENT_TOOL_GROUP_NAMES = [
	'coreWorkspace',
	'stateTask',
	'humanDecision',
	'subagent',
	'skill',
	'mcpConnector',
	'web',
	'script',
	'cron',
] as const satisfies readonly AgentToolGroupName[];

function toolsByAvailability<TAvailability extends AgentToolAvailability>(
	availability: TAvailability
): readonly AgentToolByAvailability<TAvailability>[] {
	return AGENT_TOOLS.filter(
		(tool): tool is AgentToolByAvailability<TAvailability> => tool.availability === availability
	);
}

function toolsByGroup(
	group: AgentToolGroupName,
	tools: readonly AgentToolMetadata[]
): readonly AgentToolMetadata[] {
	return tools.filter((tool) => tool.group === group);
}

function toolGroupsFor(tools: readonly AgentToolMetadata[]): Record<AgentToolGroupName, readonly AgentToolMetadata[]> {
	return Object.fromEntries(
		AGENT_TOOL_GROUP_NAMES.map((group) => [group, toolsByGroup(group, tools)])
	) as Record<AgentToolGroupName, readonly AgentToolMetadata[]>;
}

export const AGENT_DEFAULT_TOOLS = toolsByAvailability('default');

export const AGENT_DEFAULT_TOOL_GROUPS = toolGroupsFor(AGENT_DEFAULT_TOOLS);

export const AGENT_TOOL_GROUPS = toolGroupsFor(AGENT_TOOLS);

export type AgentToolName = AgentTool['name'];
export type AgentDefaultToolName = AgentToolByAvailability<'default'>['name'];

export const AGENT_TOOL_NAMES = AGENT_DEFAULT_TOOLS.map(
	(tool) => tool.name
) as readonly AgentDefaultToolName[];

export const AGENT_ALL_TOOL_NAMES = AGENT_TOOLS.map(
	(tool) => tool.name
) as readonly AgentToolName[];

export const AGENT_TOOL_READ_ONLY_DENY_NAMES = [
	'file_edit',
	'exec',
	'undo_last_operation',
	'mcp_connect_server',
	'mcp_refresh_server',
	'mcp_call_tool',
	'script_run',
	'cron_create',
	'cron_update',
	'cron_delete',
	'cron_start',
	'cron_stop',
	'cron_run',
	'file_write',
	'apply_patch',
	'file_delete',
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
