
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
	setProvider: (provider: { id: string; name: string; baseURL: string }) => Promise<void>;
	setModel: (model: { id: string; name: string }) => Promise<void>;
}

export interface AppApi {
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
};

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		assistant: AssistantApi;
	}
}
