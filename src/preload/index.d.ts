
export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	isMaximized: () => Promise<boolean>;
	isFullScreen: () => Promise<boolean>;
	onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AppApi {

};

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
	}
}
import type { AssistantAiSelection, AssistantAiSettings } from '../shared/types';
