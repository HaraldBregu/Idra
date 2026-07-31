import { webUtils } from 'electron';
import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { AppChannels } from '../shared/ipc_channels_definitions';
import type { AppApi } from './index.d';
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
};
