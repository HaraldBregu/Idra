import { contextBridge } from 'electron';
import { typedInvokeUnwrap, typedSend, typedOn } from './typed-ipc';
import {
	WindowChannels,
	AssistantChannels,
	ChannelsChannels,
	ConnectorsChannels,
	ProviderChannels,
	CronChannels,
	AppsChannels,
} from '../shared/ipc-channels';
import type {
	AppApi,
	AssistantApi,
	ChannelsApi,
	ConnectorsApi,
	CronApi,
	WindowApi,
} from './index.d';
import type { ProviderInput, PublicProvider } from '../shared/providers';
import type { CronTask, CronTaskData, CronTaskView } from '../shared/cron';
import type {
	Assistant,
	AssistantHistoryMessage,
	AssistantPendingEventPayload,
	AssistantSendResult,
	Model,
} from '../shared/service';
import type { ChannelStatusEvent, TelegramChannelProperties } from '../shared/channels';
import type { AppInfo } from '../shared/apps';
import type {
	OPENAI_CONNECTOR_CATALOG,
	ConnectorConfig,
	ConnectorCallToolOptions,
	ConnectorInput,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
} from '../shared/connectors';

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
	send: (message: string): Promise<AssistantSendResult> => {
		return typedInvokeUnwrap(AssistantChannels.send, message);
	},
	reset: (): Promise<void> => {
		return typedInvokeUnwrap(AssistantChannels.reset);
	},
	getHistory: (): Promise<AssistantHistoryMessage[]> => {
		return typedInvokeUnwrap(AssistantChannels.getHistory);
	},
	approve: (
		callId: string,
		opts?: { alwaysApprove?: boolean; editedArguments?: string }
	): Promise<AssistantSendResult> => {
		return typedInvokeUnwrap(AssistantChannels.approve, callId, opts);
	},
	reject: (
		callId: string,
		opts?: { alwaysReject?: boolean; message?: string }
	): Promise<AssistantSendResult> => {
		return typedInvokeUnwrap(AssistantChannels.reject, callId, opts);
	},
	respond: (callId: string, answer: string): Promise<AssistantSendResult> => {
		return typedInvokeUnwrap(AssistantChannels.respond, callId, answer);
	},
	cancelPending: (): Promise<void> => {
		return typedInvokeUnwrap(AssistantChannels.cancelPending);
	},
	getPending: () => {
		return typedInvokeUnwrap(AssistantChannels.getPending);
	},
	getPendingInputs: () => {
		return typedInvokeUnwrap(AssistantChannels.getPendingInputs);
	},
	onResponse: (callback: (event: { response: string }) => void): (() => void) => {
		return typedOn(AssistantChannels.response, callback);
	},
	onPending: (callback: (event: AssistantPendingEventPayload) => void): (() => void) => {
		return typedOn(AssistantChannels.pending, callback);
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
	addProvider: (input: ProviderInput): Promise<PublicProvider> => {
		return typedInvokeUnwrap(ProviderChannels.add, input);
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
	listApps: (): Promise<AppInfo[]> => {
		return typedInvokeUnwrap(AppsChannels.list);
	},
	openAppFolder: (id: string): Promise<void> => {
		return typedInvokeUnwrap(AppsChannels.openFolder, id);
	},
	deleteApp: (id: string): Promise<void> => {
		return typedInvokeUnwrap(AppsChannels.delete, id);
	},
	getAppsRoot: (): Promise<string> => {
		return typedInvokeUnwrap(AppsChannels.getRoot);
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

export const connectors: ConnectorsApi = {
	catalog: (): Promise<typeof OPENAI_CONNECTOR_CATALOG> => {
		return typedInvokeUnwrap(ConnectorsChannels.catalog);
	},
	list: (): Promise<ConnectorView[]> => {
		return typedInvokeUnwrap(ConnectorsChannels.list);
	},
	get: (id: string): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.get, id);
	},
	add: (input: ConnectorInput): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.add, input);
	},
	update: (id: string, input: ConnectorUpdateInput): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.update, id, input);
	},
	remove: (id: string): Promise<void> => {
		return typedInvokeUnwrap(ConnectorsChannels.remove, id);
	},
	enable: (id: string): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.enable, id);
	},
	disable: (id: string): Promise<ConnectorConfig> => {
		return typedInvokeUnwrap(ConnectorsChannels.disable, id);
	},
	test: (id: string): Promise<ConnectorTestResult> => {
		return typedInvokeUnwrap(ConnectorsChannels.test, id);
	},
	reconnect: (id: string): Promise<ConnectorTestResult> => {
		return typedInvokeUnwrap(ConnectorsChannels.reconnect, id);
	},
	refreshTools: (id: string): Promise<ConnectorTool[]> => {
		return typedInvokeUnwrap(ConnectorsChannels.refreshTools, id);
	},
	listTools: (id: string): Promise<ConnectorTool[]> => {
		return typedInvokeUnwrap(ConnectorsChannels.listTools, id);
	},
	callTool: (
		id: string,
		name: string,
		args: unknown,
		options?: ConnectorCallToolOptions
	): Promise<unknown> => {
		return typedInvokeUnwrap(ConnectorsChannels.callTool, id, name, args, options);
	},
};

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('app', app);
		contextBridge.exposeInMainWorld('win', win);
		contextBridge.exposeInMainWorld('assistant', assistant);
		contextBridge.exposeInMainWorld('cron', cron);
		contextBridge.exposeInMainWorld('channels', channels);
		contextBridge.exposeInMainWorld('connectors', connectors);
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
	// @ts-ignore (define in dts)
	globalThis.connectors = connectors;
}
