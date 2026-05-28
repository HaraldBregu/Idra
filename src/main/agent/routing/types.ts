import type {
	AgentConfig,
	AgentRouteBinding,
	AgentRoutePeer,
	AgentRouteSessionScope,
	AgentRoutingSettings,
} from '../../store/types';

export type { AgentConfig, AgentRouteBinding, AgentRoutePeer, AgentRouteSessionScope };

export interface AgentRouteInput {
	settings?: Partial<AgentRoutingSettings>;
	channel?: string;
	accountId?: string;
	peer?: AgentRoutePeer;
	parentPeer?: AgentRoutePeer;
	roleIds?: string[];
	fallbackAgentId?: string;
}

export interface ResolvedAgentRoute {
	agentId: string;
	sessionKey: string;
	sessionScope: AgentRouteSessionScope;
	binding?: AgentRouteBinding;
}

export interface AgentSessionKeyInput {
	agentId: string;
	kind: 'main' | 'channel' | 'subagent' | 'task';
	channelId?: string;
	accountId?: string;
	peerId?: string;
	id?: string;
	scope?: AgentRouteSessionScope;
}
