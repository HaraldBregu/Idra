export const AgentChannels = {
	send: 'agent:send',
	sendV2: 'agent:send',
	response: 'agent:response',
	cancel: 'agent:cancel',
	lastMessages: 'agent:last-messages',
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
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('../../agent/types').AgentResponseEvent };
}
