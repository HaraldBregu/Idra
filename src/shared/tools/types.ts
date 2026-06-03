import type { AgentToolApprovalPolicy } from './policy';

export type AgentToolProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';
export type AgentToolGroupName =
	| 'web'
	| 'image'
	| 'functions'
	| 'mcp'
	| 'multiTool'
	| 'toolSearch'
	| 'multiAgent';

export interface AgentToolMetadata {
	name: string;
	group: AgentToolGroupName;
	title: string;
	description: string;
	permissions: readonly string[];
	approval: AgentToolApprovalPolicy;
	profiles: readonly AgentToolProfile[];
	availability: 'default' | 'optional' | 'legacy' | 'alias';
	ownerOnly?: boolean;
}
