export const AgentChannels = {
	send: 'agent:send',
	response: 'agent:response',
	cancel: 'agent:cancel',
	lastMessages: 'agent:last-messages',
	clearMessages: 'agent:clear-messages',
} as const;

export interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: Record<string, unknown>];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.lastMessages]: {
		args: [sessionId: string];
		result: import('../../agent/types').AgentHistoryMessage[];
	};
	[AgentChannels.clearMessages]: { args: [sessionId: string]; result: void };
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('../../agent/types').AgentResponseEvent };
}
