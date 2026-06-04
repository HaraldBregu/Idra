import type {
	AgentConfig,
	AgentRouteBinding,
	AgentRoutePeer,
	AgentRouteSessionScope,
} from '../../../shared/store';

export type { AgentConfig, AgentRouteBinding, AgentRoutePeer, AgentRouteSessionScope };

export interface AgentSessionKeyInput {
	agentId: string;
	kind: 'main' | 'channel' | 'task';
	channelId?: string;
	accountId?: string;
	peerId?: string;
	id?: string;
	scope?: AgentRouteSessionScope;
}
