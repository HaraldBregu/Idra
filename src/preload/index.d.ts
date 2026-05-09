
export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	isMaximized: () => Promise<boolean>;
	isFullScreen: () => Promise<boolean>;
	onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AssistantApi {
	send: (message: string) => Promise<string>;
	reset: () => Promise<void>;
	onResponse: (callback: (event: { response: string }) => void) => () => void;
}

import type { Provider } from '../shared/providers';

export interface AppApi {
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	getProviders: () => Promise<Provider[]>;
};

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		assistant: AssistantApi;
	}
}
