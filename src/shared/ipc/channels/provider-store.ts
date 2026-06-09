export const ProviderStoreChannels = {
	get: 'provider-store:get',
	set: 'provider-store:set',
} as const;

export interface ProviderStoreInvokeChannelMap {
	[ProviderStoreChannels.get]: {
		args: [id: string];
		result: import('../../providers/types').Provider | undefined;
	};
	[ProviderStoreChannels.set]: {
		args: [id: string, provider: import('../../providers/types').Provider];
		result: import('../../providers/types').Provider;
	};
}
