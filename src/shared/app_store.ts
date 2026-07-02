export interface ModelModuleSettings {
	providerId: string;
	modelId: string;
	options?: Record<string, unknown>;
}

export type AssistantSettings = ModelModuleSettings;

export interface AgentModuleOptions {
	agentRuntime?: string;
	[key: string]: unknown;
}

export interface TaskSettings {
	allowedTaskTypes?: string[];
	defaultConcurrency?: number;
}

export interface AgentToolPolicy {
	profile?: 'minimal' | 'coding' | 'messaging' | 'full';
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
	exec?: Record<string, unknown>;
}

export interface AgentConfig {
	id: string;
	default?: boolean;
	name?: string;
	workspace?: string;
	model?: {
		providerId?: string;
		modelId?: string;
	};
	skills?: string[];
	tools?: AgentToolPolicy;
}

export type AgentRoutePeerKind = 'direct' | 'group' | 'channel' | 'thread';

export interface AgentRoutePeer {
	kind: AgentRoutePeerKind;
	id: string;
}

export interface AgentParentRoutePeer {
	kind: Exclude<AgentRoutePeerKind, 'thread'>;
	id: string;
}

export type AgentRouteSessionScope =
	| 'main'
	| 'per-peer'
	| 'per-channel-peer'
	| 'per-account-channel-peer';

export interface AgentRouteBinding {
	agentId: string;
	match: {
		channel?: string;
		accountId?: string;
		peer?: AgentRoutePeer;
		parentPeer?: AgentParentRoutePeer;
		roleIds?: string[];
	};
	session?: {
		scope?: AgentRouteSessionScope;
	};
}

export interface AgentsSettings {
	agents: AgentConfig[];
	bindings: AgentRouteBinding[];
}

export type AgentRoutingSettings = AgentsSettings;