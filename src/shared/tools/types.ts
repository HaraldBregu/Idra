import type { CronSchedulePermissionLevel } from '../cron';
import type { AgentToolApprovalPolicy } from './policy';

export type AgentToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';
export type AgentToolGroupName =
	| 'coreWorkspace'
	| 'stateTask'
	| 'humanDecision'
	| 'subagent'
	| 'skill'
	| 'mcpConnector'
	| 'script'
	| 'cron'
	| 'web';

type AgentToolAvailability = 'default' | 'optional' | 'legacy' | 'alias';
type AgentFileToolPermission = 'read' | 'write' | 'create' | 'delete';
type AgentCronToolPermission = `cron:${CronSchedulePermissionLevel}`;

type AgentToolPermission =
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
