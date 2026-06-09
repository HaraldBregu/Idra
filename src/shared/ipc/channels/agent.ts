export const AgentChannels = {
	send: 'agent:send',
	sendV2: 'agent:send',
	response: 'agent:response',
	cancel: 'agent:cancel',
	getProvider: 'agent-store:get-provider',
	setProvider: 'agent-store:set-provider',
	getModelId: 'agent-store:get-model-id',
	setModelId: 'agent-store:set-model-id',
} as const;

export interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: Record<string, unknown>];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.getProvider]: {
		args: [];
		result: import('../../providers').PublicProvider | undefined;
	};
	[AgentChannels.setProvider]: {
		args: [provider: import('../../providers').PublicProvider];
		result: boolean;
	};
	[AgentChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[AgentChannels.setModelId]: {
		args: [modelId: string];
		result: boolean;
	};
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('../../agent/types').AgentResponseEvent };
}
