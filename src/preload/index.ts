import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
import {
	WindowChannels,
	AssistantChannels,
	ChannelsChannels,
	ProviderChannels,
	CronChannels,
} from '../shared/ipc-channels';
import type { AppApi, AssistantApi, ChannelsApi, CronApi, WindowApi } from './index.d';
import type { PublicProvider } from '../shared/providers';
import type { CronTask, CronTaskData, CronTaskView } from '../shared/cron';
import type { Assistant, AssistantHistoryMessage, Model } from '../shared/service';
import type { ChannelStatusEvent, TelegramChannelProperties } from '../shared/types';

const win: WindowApi = {
	minimize: (): void => {
		typedSend(WindowChannels.minimize);
	},
	maximize: (): void => {
		typedSend(WindowChannels.maximize);
	},
	close: (): void => {
		typedSend(WindowChannels.close);
	},
	popupMenu: (): void => {
		typedSend(WindowChannels.popupMenu);
	},
	isMaximized: (): Promise<boolean> => {
		return typedInvokeUnwrap(WindowChannels.isMaximized);
	},
	isFullScreen: (): Promise<boolean> => {
		return typedInvokeUnwrap(WindowChannels.isFullScreen);
	},
	onMaximizeChange: (callback: (isMaximized: boolean) => void): (() => void) => {
		return typedOn(WindowChannels.maximizeChange, callback);
	},
	onFullScreenChange: (callback: (isFullScreen: boolean) => void): (() => void) => {
		return typedOn(WindowChannels.fullScreenChange, callback);
	},
} satisfies WindowApi;

export const assistant: AssistantApi = {
	send: (message: string): Promise<string> => {
		return typedInvokeUnwrap(AssistantChannels.send, message);
	},
	reset: (): Promise<void> => {
		return typedInvokeUnwrap(AssistantChannels.reset);
	},
	getHistory: (): Promise<AssistantHistoryMessage[]> => {
		return typedInvokeUnwrap(AssistantChannels.getHistory);
	},
	onResponse: (callback: (event: { response: string }) => void): (() => void) => {
		return typedOn(AssistantChannels.response, callback);
	},
} satisfies AssistantApi;

export const app: AppApi = {
	setProviderApiKey: (providerId: string, apikey: string): Promise<void> => {
		return typedInvokeUnwrap(ProviderChannels.setApiKey, providerId, apikey);
	},
	isProviderApiKeySaved: (providerId: string): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.isApiKeySaved, providerId);
	},
	getProviders: (): Promise<PublicProvider[]> => {
		return typedInvokeUnwrap(ProviderChannels.getAll);
	},
	getModels: (provider: PublicProvider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getModels, provider);
	},
	getAssistantService: (): Promise<Assistant | undefined> => {
		return typedInvokeUnwrap(ProviderChannels.getAssistantService);
	},
	saveAssistantService: (provider: PublicProvider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.saveAssistantService, provider, model);
	},
};

export const cron: CronApi = {
	list: (): Promise<CronTaskView[]> => {
		return typedInvokeUnwrap(CronChannels.list);
	},
	add: <TData extends CronTaskData>(
		expression: string,
		data: TData,
		options?: { id?: string; timezone?: string }
	): Promise<CronTask<TData>> => {
		return typedInvokeUnwrap(CronChannels.add, expression, data, options) as Promise<
			CronTask<TData>
		>;
	},
	remove: (id: string): Promise<void> => {
		return typedInvokeUnwrap(CronChannels.remove, id);
	},
};

export const channels: ChannelsApi = {
	getTelegramConfig: (): Promise<TelegramChannelProperties> => {
		return typedInvokeUnwrap(ChannelsChannels.getTelegramConfig);
	},
	saveTelegramConfig: (
		config: TelegramChannelProperties
	): Promise<TelegramChannelProperties> => {
		return typedInvokeUnwrap(ChannelsChannels.saveTelegramConfig, config);
	},
	getTelegramStatus: (): Promise<ChannelStatusEvent | undefined> => {
		return typedInvokeUnwrap(ChannelsChannels.getTelegramStatus);
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

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('assistant', assistant);
		contextBridge.exposeInMainWorld('cron', cron);
		contextBridge.exposeInMainWorld('channels', channels);
	} catch (error) {
		console.error('[preload] Failed to expose IPC APIs:', error);
	}
} else {
	// @ts-ignore (define in dts)
	globalThis.app = app;
	// @ts-ignore (define in dts)
	globalThis.win = win;
	// @ts-ignore (define in dts)
	globalThis.assistant = assistant;
	// @ts-ignore (define in dts)
	globalThis.cron = cron;
	// @ts-ignore (define in dts)
	globalThis.channels = channels;
}
