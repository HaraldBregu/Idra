export interface WindowApi {
	minimize: () => void;
	close: () => void;
	popupMenu: () => void;
	isFullScreen: () => Promise<boolean>;
	onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
}

export interface AgentApi {
	send_v2: (
		message: string,
		options?: Record<string, unknown>
	) => AsyncIterable<AgentResponseEvent>;
}

export interface CronApi {
	pauseSchedule: (scheduleId: string) => Promise<void>;
	resumeSchedule: (scheduleId: string) => Promise<void>;
	deleteSchedule: (scheduleId: string) => Promise<void>;
	listSchedules: (filter?: CronScheduleFilter) => Promise<CronSchedule[]>;
	getSchedule: (scheduleId: string) => Promise<CronSchedule>;
	runNow: (scheduleId: string) => Promise<CronScheduledTask>;
	subscribeToSchedules: (listener: (event: CronScheduleEvent) => void) => () => void;
}

export interface ChannelsApi {
	listCatalog: () => Promise<ChannelCatalogEntry[]>;
	getConfig: () => Promise<Channel>;
	saveChannelConfig: <TKey extends ChannelType>(
		type: TKey,
		config: Channel[TKey]
	) => Promise<Channel[TKey]>;
	getStatus: (type?: ChannelType) => Promise<ChannelStatusEvent | undefined>;
	startTelegram: () => Promise<ChannelStatusEvent | undefined>;
	stopTelegram: () => Promise<void>;
	restartTelegram: () => Promise<ChannelStatusEvent | undefined>;
	onStatusChanged: (callback: (event: ChannelStatusEvent) => void) => () => void;
}

export interface ConnectorsApi {
	list: () => Promise<ConnectorRecord>;
	get: (id: string) => Promise<ConnectorRecord>;
	upsert: (input: ConnectorInput) => Promise<ConnectorRecord>;
}

export interface SkillsApi {
	list: () => Promise<SkillInfo[]>;
	importSkill: () => Promise<SkillImportResult | undefined>;
	downloadSkill: (name: string) => Promise<SkillDownloadResult | undefined>;
	delete: (name: string) => Promise<SkillDeleteResult>;
	getRoot: () => Promise<string>;
}

export interface ProviderStoreApi {
	get: (id: string) => Promise<Provider | undefined>;
	set: (id: string, provider: Provider) => Promise<Provider>;
}

import type { PublicProvider } from '../shared/providers';
import type { Provider } from '../shared/providers/types';
import type {
	CronSchedule,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduledTask,
} from '../shared/app/cron';
import type { AgentResponseEvent } from '../shared/agent/types';
import type { ProviderModel as Model } from '../shared/providers';
import type { ChannelStatusEvent } from '../shared/channels';
import type { Channel, ChannelType } from '../shared/channels';
import type { ChannelCatalogEntry } from '../shared/channels';
import type {
	SkillDeleteResult,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
} from '../shared/skills/types';
import type {
	MicrophonePermissionSettings,
	CameraPermissionSettings,
	SystemPreferencePaneId,
} from '../shared/app/app-permissions';

export interface ModelSelection {
	provider: PublicProvider;
	model: Model;
}

export type ConnectorRecord = Record<
	string,
	{
		type: 'mcp';
		server_label: string;
		server_url: string;
		server_description?: string;
		authorization?: string;
		require_approval?: 'always' | 'never';
		defer_loading?: boolean;
		enabled?: boolean;
		last_refreshed_at?: string;
		created_at?: string;
		updated_at?: string;
		last_error?: string;
	}
>;

export type ConnectorInput = {
	id?: string;
	name: string;
	connectorId: string;
	serverLabel?: string;
	serverDescription?: string;
	serverUrl?: string;
	authorization?: string;
	requireApproval?: 'always' | 'never';
	deferLoading?: boolean;
	enabled?: boolean;
	createdAt?: string;
};

export type OAuthAuthorizeInput = {
	service: string;
	serviceId?: string;
	clientIdEnv: string;
	clientSecretEnv?: string;
	authorizationUrl: string;
	tokenUrl: string;
	userInfoUrl?: string;
	scopes: readonly string[];
	accessType?: string;
	prompt?: string;
};

export type OAuthAuthorizeResult = {
	service: string;
	serviceId?: string;
	authorizationUrl: string;
	redirectUri: string;
	scopes: readonly string[];
	accessToken: string;
	refreshToken?: string;
	tokenType?: string;
	scope?: string;
	expiresAt?: string;
	accountEmail?: string;
	connectedAt: string;
};

export interface RealtimeTranscriptionStartRequest {
	language?: string;
}

export interface RealtimeTranscriptionSession {
	id: string;
	model: string;
	sampleRate: 24000;
}

export type RealtimeTranscriptionEvent =
	| {
			type: 'started';
			sessionId: string;
			model: string;
	  }
	| {
			type: 'delta';
			sessionId: string;
			itemId: string;
			contentIndex: number;
			delta: string;
	  }
	| {
			type: 'committed';
			sessionId: string;
			itemId: string;
	  }
	| {
			type: 'completed';
			sessionId: string;
			itemId: string;
			contentIndex: number;
			transcript: string;
	  }
	| {
			type: 'error';
			sessionId?: string;
			message: string;
	  }
	| {
			type: 'closed';
			sessionId: string;
	  };

export interface AppApi {
	openAppDataFolder: () => Promise<void>;
	openExternalUrl: (url: string) => Promise<void>;
	authorizeOAuth: (input: OAuthAuthorizeInput) => Promise<OAuthAuthorizeResult>;
	setTrayEnabled: (enabled: boolean) => Promise<void>;
	getTrayEnabled: () => Promise<boolean>;
	getMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	setMicrophoneEnabled: (enabled: boolean) => Promise<MicrophonePermissionSettings>;
	requestMicrophonePermission: () => Promise<MicrophonePermissionSettings>;
	openSystemPreference: (pane: SystemPreferencePaneId) => Promise<void>;
	getCameraPermission: () => Promise<CameraPermissionSettings>;
	setCameraEnabled: (enabled: boolean) => Promise<CameraPermissionSettings>;
	requestCameraPermission: () => Promise<CameraPermissionSettings>;
	setProviderApiKey: (providerId: string, apikey: string) => Promise<void>;
	isProviderApiKeySaved: (providerId: string) => Promise<boolean>;
	getProviders: () => Promise<PublicProvider[]>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	getAgentService: () => Promise<ModelSelection | undefined>;
	saveAgentService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getSpeechTranscriberService: () => Promise<ModelSelection | undefined>;
	getSpeechToTextModels: (provider: PublicProvider) => Promise<Model[]>;
	saveSpeechTranscriberService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSpeechService: () => Promise<ModelSelection | undefined>;
	getTextToSpeechModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToSpeechService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getImageCreatorService: () => Promise<ModelSelection | undefined>;
	getImageCreatorModels: (provider: PublicProvider) => Promise<Model[]>;
	saveImageCreatorService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToVideoService: () => Promise<ModelSelection | undefined>;
	getTextToVideoModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToVideoService: (provider: PublicProvider, model: Model) => Promise<boolean>;
	getTextToSoundService: () => Promise<ModelSelection | undefined>;
	getTextToSoundModels: (provider: PublicProvider) => Promise<Model[]>;
	saveTextToSoundService: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

export interface AgentStoreApi {
	get: () => Promise<ModelSelection | undefined>;
	set: (provider: PublicProvider, model: Model) => Promise<boolean>;
}

export interface RealtimeTranscriptionApi {
	start: (request?: RealtimeTranscriptionStartRequest) => Promise<RealtimeTranscriptionSession>;
	appendAudio: (sessionId: string, audio: string) => void;
	finish: (sessionId: string) => Promise<void>;
	cancel: (sessionId: string) => Promise<void>;
	onEvent: (callback: (event: RealtimeTranscriptionEvent) => void) => () => void;
}

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agentStore: AgentStoreApi;
		agent: AgentApi;
		realtimeTranscription: RealtimeTranscriptionApi;
		cron: CronApi;
		channels: ChannelsApi;
		connectors: ConnectorsApi;
		skills: SkillsApi;
		providerStore: ProviderStoreApi;
	}
}
