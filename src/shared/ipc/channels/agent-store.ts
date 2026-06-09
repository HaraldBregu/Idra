export const AgentStoreChannels = {
	get: 'agent-store:get',
	set: 'agent-store:set',
} as const;

export interface AgentStoreInvokeChannelMap {
	[AgentStoreChannels.get]: {
		args: [];
		result: import('../agents/service').ModelSelection | undefined;
	};
	[AgentStoreChannels.set]: {
		args: [
			provider: import('../../providers').PublicProvider,
			model: import('../agents/service').Model,
		];
		result: boolean;
	};
}
