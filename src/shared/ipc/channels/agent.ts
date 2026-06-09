export const AgentChannels = {
	sendV2: 'agent:send-v2',
	response: 'agent:response',
	cancel: 'agent:cancel',
} as const;

export interface AgentInvokeChannelMap {
	[AgentChannels.sendV2]: {
		args: [message: string, options?: AgentSendRuntimeOptions];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('../agents/service').AgentResponseEvent };
}
