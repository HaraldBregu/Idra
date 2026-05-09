import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
import { WindowChannels, AssistantChannels } from '../shared/channels';
import type { AppApi, AssistantApi, AssistantResponse, WindowApi } from './index.d';

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

const assistant: AssistantApi = {
	send: (message: string): Promise<string> => {
		return typedInvokeUnwrap(AssistantChannels.send, message);
	},
	reset: (): Promise<void> => {
		return typedInvokeUnwrap(AssistantChannels.reset);
	},
	onResponse: (callback: (event: AssistantResponse) => void): (() => void) => {
		return typedOn(AssistantChannels.response, callback);
	},
} satisfies AssistantApi;

export const app: AppApi = {
	assistant,
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
	} catch (error) {
		console.error('[preload] Failed to expose IPC APIs:', error);
	}
} else {
	// @ts-ignore (define in dts)
	globalThis.app = app;
	// @ts-ignore (define in dts)
	globalThis.win = win;
}
