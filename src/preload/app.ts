import { webUtils } from 'electron';
import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { AppChannels } from '../shared/ipc_channels_definitions';
import type { AppApi } from './index.d';
import type { Channel, ChannelStatusEvent, ChannelType } from '../shared';
import { optionalTrimmedString } from './normalize';

export const app: AppApi = {
	models: () => {
		return typedInvokeUnwrap(AppChannels.models);
	},
	databases: () => {
		return typedInvokeUnwrap(AppChannels.databases);
	},
	storages: () => {
		return typedInvokeUnwrap(AppChannels.storages);
	},
	webSearches: () => {
		return typedInvokeUnwrap(AppChannels.webSearches);
	},
	mcps: () => {
		return typedInvokeUnwrap(AppChannels.mcps);
	},
	bots: () => {
		return typedInvokeUnwrap(AppChannels.bots);
	},
	onModelsChanged: (callback: () => void): (() => void) => {
		return typedOn(AppChannels.modelsChanged, callback);
	},
	getPathForFile: (file: File): string => {
		return webUtils.getPathForFile(file);
	},
	openAppDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openAppDataFolder);
	},
	openDataFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openDataFolder);
	},
	openProvidersFolder: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openProvidersFolder);
	},
	openExternalUrl: (url: string): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.openExternalUrl, url);
	},
	setTrayEnabled: (enabled: boolean): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.setTrayEnabled, enabled);
	},
	getTrayEnabled: (): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.getTrayEnabled);
	},
	setKeepAwake: (enabled: boolean): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.setKeepAwake, enabled);
	},
	getKeepAwake: (): Promise<boolean> => {
		return typedInvokeUnwrap(AppChannels.getKeepAwake);
	},
	setLanguage: (language) => {
		return typedInvokeUnwrap(AppChannels.setLanguage, language);
	},
	getLanguage: () => {
		return typedInvokeUnwrap(AppChannels.getLanguage);
	},
	setTheme: (theme) => {
		return typedInvokeUnwrap(AppChannels.setTheme, theme);
	},
	getTheme: () => {
		return typedInvokeUnwrap(AppChannels.getTheme);
	},
	getMicrophonePermission: () => {
		return typedInvokeUnwrap(AppChannels.getMicrophonePermission);
	},
	setMicrophoneEnabled: (enabled: boolean) => {
		return typedInvokeUnwrap(AppChannels.setMicrophoneEnabled, enabled);
	},
	requestMicrophonePermission: () => {
		return typedInvokeUnwrap(AppChannels.requestMicrophonePermission);
	},
	openSystemPreference: (pane) => {
		return typedInvokeUnwrap(AppChannels.openSystemPreference, pane);
	},
	getCameraPermission: () => {
		return typedInvokeUnwrap(AppChannels.getCameraPermission);
	},
	setCameraEnabled: (enabled: boolean) => {
		return typedInvokeUnwrap(AppChannels.setCameraEnabled, enabled);
	},
	requestCameraPermission: () => {
		return typedInvokeUnwrap(AppChannels.requestCameraPermission);
	},
	openVideo: (path: string): Promise<void> => {
		const normalizedPath = optionalTrimmedString(path);
		if (!normalizedPath) throw new Error('Invalid video path.');
		return typedInvokeUnwrap(AppChannels.openVideo, normalizedPath);
	},
	showImageContextMenu: (path: string): Promise<void> => {
		const normalizedPath = optionalTrimmedString(path);
		if (!normalizedPath) throw new Error('Invalid image path.');
		return typedInvokeUnwrap(AppChannels.showImageContextMenu, normalizedPath);
	},
	showVideoContextMenu: (path: string): Promise<void> => {
		const normalizedPath = optionalTrimmedString(path);
		if (!normalizedPath) throw new Error('Invalid video path.');
		return typedInvokeUnwrap(AppChannels.showVideoContextMenu, normalizedPath);
	},
	showAudioContextMenu: (path: string): Promise<void> => {
		const normalizedPath = optionalTrimmedString(path);
		if (!normalizedPath) throw new Error('Invalid audio path.');
		return typedInvokeUnwrap(AppChannels.showAudioContextMenu, normalizedPath);
	},
	uploadProvider: (): Promise<string | null> => {
		return typedInvokeUnwrap(AppChannels.uploadProvider);
	},
	getChannels: (): Promise<Channel> => {
		return typedInvokeUnwrap(AppChannels.getChannels);
	},
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	): Promise<Channel[TKey]> => {
		return typedInvokeUnwrap(AppChannels.saveChannelConfig, type, config) as Promise<
			Channel[TKey]
		>;
	},
	setDefaultChannel: (channel: ChannelType): Promise<ChannelType> => {
		return typedInvokeUnwrap(AppChannels.setDefaultChannel, channel);
	},
	getChannelsProviderId: (): Promise<string> => {
		return typedInvokeUnwrap(AppChannels.getChannelsProviderId);
	},
	setChannelsProviderId: (providerId: string): Promise<void> => {
		const normalizedProviderId = optionalTrimmedString(providerId);
		if (!normalizedProviderId) throw new Error('Invalid channels provider id.');
		return typedInvokeUnwrap(AppChannels.setChannelsProviderId, normalizedProviderId);
	},
	getChannelsModelId: (): Promise<string> => {
		return typedInvokeUnwrap(AppChannels.getChannelsModelId);
	},
	setChannelsModelId: (modelId: string): Promise<void> => {
		const normalizedModelId = optionalTrimmedString(modelId);
		if (!normalizedModelId) throw new Error('Invalid channels model id.');
		return typedInvokeUnwrap(AppChannels.setChannelsModelId, normalizedModelId);
	},
	getChannelsStatus: (type?: ChannelType): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(AppChannels.getChannelsStatus, type);
	},
	startTelegram: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(AppChannels.startTelegram);
	},
	stopTelegram: (): Promise<void> => {
		return typedInvokeUnwrap(AppChannels.stopTelegram);
	},
	restartTelegram: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(AppChannels.restartTelegram);
	},
	onChannelsStatusChanged: (callback: (event: ChannelStatusEvent) => void): (() => void) => {
		return typedOn(AppChannels.channelsStatusChanged, callback);
	},
};
