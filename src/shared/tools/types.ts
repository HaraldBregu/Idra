import type { CronSchedulePermissionLevel } from '../cron';
import type { AgentToolApprovalPolicy } from './policy';
import type { AgentToolGroupName } from './groups';

export type AgentToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';
export type AgentToolAvailability = 'default' | 'optional' | 'legacy' | 'alias';
export type AgentFileToolPermission = 'read' | 'write' | 'create' | 'delete';
export type AgentCronToolPermission = `cron:${CronSchedulePermissionLevel}`;

export type AgentToolPermission =
	| AgentFileToolPermission
	| 'execute'
	| 'state'
	| 'human'
	| 'delegate'
	| 'skill'
	| 'mcp:read'
	| 'mcp:connect'
	| 'mcp:call'
	| AgentCronToolPermission;

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
