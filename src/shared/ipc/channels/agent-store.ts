export const AgentStoreChannels = {
	get: 'agent-store:get',
	set: 'agent-store:set',
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
}
