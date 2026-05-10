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
	getHistory: () => Promise<AssistantHistoryMessage[]>;
	onResponse: (callback: (event: { response: string }) => void) => () => void;
}

export interface CronApi {
	list: () => Promise<CronTask[]>;
	add: (
		expression: string,
		message: string,
		options?: { id?: string; timezone?: string }
	) => Promise<CronTask>;
	remove: (id: string) => Promise<void>;
}

import type { PublicProvider } from '../shared/providers';
import type { CronTask, CronTaskView } from '../shared/cron';
import type { Assistant, AssistantHistoryMessage, Model } from '../shared/service';

export interface AppApi {
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	getAssistantService: () => Promise<Assistant | undefined>;
	saveAssistantService: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		assistant: AssistantApi;
		cron: CronApi;
	}
}
