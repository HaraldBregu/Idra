export const AgentStoreChannels = {
	get: 'agent-store:get',
	set: 'agent-store:set',
	getProvider: 'agent-store:get-provider',
	setProvider: 'agent-store:set-provider',
	getModelId: 'agent-store:get-model-id',
	setModelId: 'agent-store:set-model-id',
} as const;

export interface AgentStoreInvokeChannelMap {
	[AgentStoreChannels.get]: {
		args: [];
		result:
			| {
					provider: import('../../providers').PublicProvider;
					model: import('../../providers').ProviderModel;
			  }
			| undefined;
	};
	[AgentStoreChannels.set]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../../providers').ProviderModel,
		];
		result: boolean;
	};
	[AgentStoreChannels.getProvider]: {
		args: [];
		result: import('../../providers').PublicProvider | undefined;
	};
	[AgentStoreChannels.setProvider]: {
		args: [provider: import('../../providers').PublicProvider];
		result: boolean;
	};
	[AgentStoreChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[AgentStoreChannels.setModelId]: {
		args: [modelId: string];
		result: boolean;
	};
}
