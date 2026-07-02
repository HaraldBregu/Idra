export const ProviderChannels = {
	get: 'provider-store:get',
	set: 'provider-store:set',
} as const;

export const ProviderStoreChannels = ProviderChannels;

export interface ProviderInvokeChannelMap {
	[ProviderChannels.get]: {
		args: [id: string];
		result: import('./providers.types').Provider | undefined;
	};
	[ProviderChannels.set]: {
		args: [id: string, provider: import('./providers.types').Provider];
		result: import('./providers.types').Provider;
	};
}

export type ProviderStoreInvokeChannelMap = ProviderInvokeChannelMap;
