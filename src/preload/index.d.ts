
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
import type { Model } from '../shared/service';

export interface AppApi {
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	getProviders: () => Promise<Provider[]>;
	getModels: (provider: Provider) => Promise<Model[]>;
	saveAssistantService: (provider: Provider, model: Model) => Promise<boolean>;
};

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		assistant: AssistantApi;
	}
}
