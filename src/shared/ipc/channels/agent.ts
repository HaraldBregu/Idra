export const AgentChannels = {
	send: 'agent:send',
	response: 'agent:response',
	cancel: 'agent:cancel',
	lastMessages: 'agent:last-messages',
	clearMessages: 'agent:clear-messages',
	getProvider: 'agent:get-provider',
	setProvider: 'agent:set-provider',
	getModelId: 'agent:get-model-id',
	setModelId: 'agent:set-model-id',
} as const;

export interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: Record<string, unknown>];
		result: string;
	};
	[AgentChannels.respondPermission]: {
		args: [toolCallId: string, allow: boolean];
		result: void;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.lastMessages]: {
		args: [sessionId: string];
		result: import('../../agent/types').AgentHistoryMessage[];
	};
	[AgentChannels.clearMessages]: { args: [sessionId: string]; result: void };
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
