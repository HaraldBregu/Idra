import type { ChannelCapabilities, ChannelMetadata, ChannelPlugin } from './types';
import type { ChannelType } from '../../shared/channels';

const DEFAULT_CAPABILITIES: ChannelCapabilities = {
	inbound: true,
	outbound: true,
	text: true,
	media: false,
	voice: false,
	polls: false,
	receipts: true,
	threading: true,
	groups: true,
	setup: true,
	longRunningGateway: true,
};

export function createChannelPluginBase<TConfig, TSetupInput>(options: {
	id: ChannelType;
	meta: ChannelMetadata;
	capabilities?: Partial<ChannelCapabilities>;
}): Pick<ChannelPlugin<TConfig, TSetupInput>, 'id' | 'meta' | 'capabilities'> {
	return {
		id: options.id,
		meta: options.meta,
		capabilities: {
			...DEFAULT_CAPABILITIES,
			...(options.capabilities ?? {}),
		},
	};
}

export function defineChannelPluginEntry<TConfig, TSetupInput>(
	plugin: ChannelPlugin<TConfig, TSetupInput>
): ChannelPlugin<TConfig, TSetupInput> {
	return plugin;
}
