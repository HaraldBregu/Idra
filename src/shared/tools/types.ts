import type { CronSchedulePermissionLevel } from '../cron';
import type { AgentToolApprovalPolicy } from './policy';

export type AgentToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';
export type AgentToolGroupName =
	| 'coreWorkspace'
	| 'stateTask'
	| 'subagent'
	| 'skill'
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
		| 'delegate'
		| 'skill'
		| `cron:${CronSchedulePermissionLevel}`
	)[];
	approval: AgentToolApprovalPolicy;
	profiles: readonly AgentToolProfile[];
	availability: 'default' | 'optional' | 'legacy' | 'alias';
	ownerOnly?: boolean;
}
