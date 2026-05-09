import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
import { WindowChannels, AssistantChannels, ProviderChannels } from '../shared/channels';
import type { AppApi, AssistantApi, WindowApi } from './index.d';
import type { PublicProvider } from '../shared/providers';
import type { Model } from '../shared/service';

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
	onResponse: (callback: (event: { response: string }) => void): (() => void) => {
		return typedOn(AssistantChannels.response, callback);
	},
} satisfies AssistantApi;

export const app: AppApi = {
	setProviderApiKey: (providerId: string, apikey: string): Promise<void> => {
		return typedInvokeUnwrap(ProviderChannels.setApiKey, providerId, apikey);
	},
	getProviders: (): Promise<Provider[]> => {
		return typedInvokeUnwrap(ProviderChannels.getAll);
	},
	getModels: (provider: Provider): Promise<Model[]> => {
		return typedInvokeUnwrap(ProviderChannels.getModels, provider);
	},
	saveAssistantService: (provider: Provider, model: Model): Promise<boolean> => {
		return typedInvokeUnwrap(ProviderChannels.saveAssistantService, provider, model);
	},
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('assistant', assistant);
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
}
