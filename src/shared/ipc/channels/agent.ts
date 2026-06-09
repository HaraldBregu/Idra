export const AgentChannels = {
	send: 'agent:send',
	sendV2: 'agent:send',
	response: 'agent:response',
	cancel: 'agent:cancel',
} as const;

export interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: Record<string, unknown>];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('../../agent/types').AgentResponseEvent };
}
