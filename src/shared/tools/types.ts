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

export interface AgentToolMetadata {
	name: string;
	group: AgentToolGroupName;
	title: string;
	description: string;
	permissions: readonly (
		| 'read'
		| 'write'
		| 'create'
		| 'delete'
		| 'execute'
		| 'state'
		| 'human'
		| 'delegate'
		| 'skill'
		| 'mcp:read'
		| 'mcp:connect'
		| 'mcp:call'
		| `cron:${CronSchedulePermissionLevel}`
	)[];
	approval: AgentToolApprovalPolicy;
	profiles: readonly AgentToolProfile[];
	availability: 'default' | 'optional' | 'legacy' | 'alias';
	ownerOnly?: boolean;
}
