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
	task: {
		title: 'State / task tools',
		description: 'Track run-local todos, task completion, and scratch notes.',
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
