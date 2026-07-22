import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { ChannelsChannels } from '../shared/ipc_channels_definitions';
import type { ChannelsApi } from './index.d';
import type { Channel, ChannelStatusEvent, ChannelType } from '../shared';
import { optionalTrimmedString } from './normalize';

export const channels: ChannelsApi = {
	getConfig: (): Promise<Channel> => {
		return typedInvokeUnwrap(ChannelsChannels.getConfig);
	},
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	): Promise<Channel[TKey]> => {
		return typedInvokeUnwrap(ChannelsChannels.saveChannelConfig, type, config) as Promise<
			Channel[TKey]
		>;
	},
	getProviderId: (): Promise<string> => {
		return typedInvokeUnwrap(ChannelsChannels.getProviderId);
	},
	setProviderId: (providerId: string): Promise<void> => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid channels provider id.');
		return typedInvokeUnwrap(ChannelsChannels.setProviderId, normalizedProviderId);
	},
	getModelId: (): Promise<string> => {
		return typedInvokeUnwrap(ChannelsChannels.getModelId);
	},
	setModelId: (modelId: string): Promise<void> => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid channels model id.');
		return typedInvokeUnwrap(ChannelsChannels.setModelId, normalizedModelId);
	},
	getStatus: (type?: ChannelType): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.getStatus, type);
	},
	startTelegram: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.startTelegram);
	},
	stopTelegram: (): Promise<void> => {
		return typedInvokeUnwrap(ChannelsChannels.stopTelegram);
	},
	restartTelegram: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.restartTelegram);
	},
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void): (() => void) => {
		return typedOn(ChannelsChannels.statusChanged, callback);
	},
};
