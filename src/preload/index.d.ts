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
	cancel: () => Promise<void>;
	getHistory: () => Promise<AssistantHistoryMessage[]>;
	resolveApproval: (id: string, decision: ApprovalDecision | boolean) => Promise<boolean>;
	resolveInput: (id: string, answer: string) => Promise<boolean>;
	getPending: () => Promise<AssistantPendingState>;
	onResponse: (callback: (event: AssistantResponseDelta) => void) => () => void;
	onPending: (callback: (event: AssistantPendingEventPayload) => void) => () => void;
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

export interface ConnectorsApi {
	catalog: () => Promise<typeof OPENAI_CONNECTOR_CATALOG>;
	list: () => Promise<ConnectorView[]>;
	get: (id: string) => Promise<ConnectorConfig>;
	add: (input: ConnectorInput) => Promise<ConnectorConfig>;
	update: (id: string, input: ConnectorUpdateInput) => Promise<ConnectorConfig>;
	remove: (id: string) => Promise<void>;
	enable: (id: string) => Promise<ConnectorConfig>;
	disable: (id: string) => Promise<ConnectorConfig>;
	test: (id: string) => Promise<ConnectorTestResult>;
	reconnect: (id: string) => Promise<ConnectorTestResult>;
	refreshTools: (id: string) => Promise<ConnectorTool[]>;
	listTools: (id: string) => Promise<ConnectorTool[]>;
	callTool: (
		id: string,
		name: string,
		args: unknown,
		options?: ConnectorCallToolOptions
	) => Promise<unknown>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	importSkill: () => Promise<SkillInfo | undefined>;
	delete: (id: string) => Promise<void>;
	getRoot: () => Promise<string>;
}

import type { ProviderInput, PublicProvider } from '../shared/providers';
import type { CronTask, CronTaskData, CronTaskView } from '../shared/cron';
import type {
	Assistant,
	AssistantHistoryMessage,
	ApprovalDecision,
	AssistantPendingEventPayload,
	AssistantPendingState,
	AssistantResponseDelta,
	Model,
} from '../shared/service';
import type { ChannelStatusEvent, TelegramChannelProperties } from '../shared/channels';
import type { AppInfo } from '../shared/apps';
import type { SkillInfo } from '../shared/skills';
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

export interface AppApi {
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	addProvider: (input: ProviderInput) => Promise<PublicProvider>;
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
		connectors: ConnectorsApi;
		skills: SkillsApi;
	}
}
