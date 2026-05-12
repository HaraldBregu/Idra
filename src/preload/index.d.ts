export interface WindowApi {
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	popupMenu: () => void;
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
	list: () => Promise<CronTaskView[]>;
	add: <TData extends CronTaskData>(
		expression: string,
		data: TData,
		options?: { id?: string; timezone?: string }
	) => Promise<CronTask<TData>>;
	remove: (id: string) => Promise<void>;
}

export interface ChannelsApi {
	getTelegramConfig: () => Promise<TelegramChannelProperties>;
	saveTelegramConfig: (
		config: TelegramChannelProperties
	) => Promise<TelegramChannelProperties>;
	getTelegramStatus: () => Promise<ChannelStatusEvent | undefined>;
	startTelegram: () => Promise<ChannelStatusEvent | undefined>;
	stopTelegram: () => Promise<void>;
	restartTelegram: () => Promise<ChannelStatusEvent | undefined>;
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void) => () => void;
}

import type { PublicProvider } from '../shared/providers';
import type { CronTask, CronTaskData, CronTaskView } from '../shared/cron';
import type { Assistant, AssistantHistoryMessage, Model } from '../shared/service';
import type { ChannelStatusEvent, TelegramChannelProperties } from '../shared/channels';
import type { AppInfo } from '../shared/apps';

export interface AppApi {
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	getAssistantService: () => Promise<Assistant | undefined>;
	saveAssistantService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	listApps: () => Promise<AppInfo[]>;
	openAppFolder: (id: string) => Promise<void>;
	deleteApp: (id: string) => Promise<void>;
	getAppsRoot: () => Promise<string>;
}

declare global {
	interface Window {
		win?: WindowApi;
		app: AppApi;
		assistant: AssistantApi;
		cron: CronApi;
		channels: ChannelsApi;
	}
}
