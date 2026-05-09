
export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	isMaximized: () => Promise<boolean>;
	isFullScreen: () => Promise<boolean>;
	onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AssistantResponse {
	response: string;
}

export interface AssistantApi {
	send: (message: string) => Promise<string>;
	reset: () => Promise<void>;
	onResponse: (callback: (event: AssistantResponse) => void) => () => void;
}

export interface AppApi {
	assistant: AssistantApi;
};

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
	}
}
