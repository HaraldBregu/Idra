import {
	Binary,
	BookOpenText,
	Bot,
	Blocks,
	Boxes,
	Database,
	Folder,
	HeartPulse,
	ImageIcon,
	Info,
	Library,
	ListChecks,
	Mic,
	MonitorCog,
	Music,
	Plug,
	Puzzle,
	RadioTower,
	Search,
	Server,
	ShieldCheck,
	Sparkles,
	Video,
	Volume2,
	type LucideIcon,
} from 'lucide-react';
import { AGENTS, type AgentId } from '@/lib/compat';

export interface SettingsNavigationItem {
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly icon: LucideIcon;
	readonly comingSoon?: boolean;
}

export interface SettingsDetailItem {
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey?: string;
	readonly keywords?: string;
	readonly icon?: LucideIcon;
}

export interface SettingsModelServiceItem {
	readonly id: AgentId;
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly keywords: string;
	readonly icon: LucideIcon;
	readonly comingSoon?: boolean;
}

export const SETTINGS_MODEL_SERVICE_ITEMS: readonly SettingsModelServiceItem[] = [
	{
		id: AGENTS.assistant,
		path: '/settings/assistant',
		labelKey: 'settings.modelServices.assistantName',
		descriptionKey: 'settings.modelServices.fridayDescription',
		keywords: 'friday service default provider model',
		icon: Bot,
	},
	{
		id: AGENTS.speechToText,
		path: '/settings/providers/transcribe',
		labelKey: 'settings.modelServices.speechTranscriberName',
		descriptionKey: 'settings.modelServices.speechTranscriberDescription',
		keywords: 'speech transcription transcribe audio voice microphone model',
		icon: Mic,
	},
	{
		id: AGENTS.textToSpeech,
		path: '/settings/providers/voice',
		labelKey: 'settings.modelServices.voiceName',
		descriptionKey: 'settings.modelServices.voiceDescription',
		keywords: 'voice text to speech tts output speaking audio synthesis model',
		icon: Volume2,
	},
	{
		id: AGENTS.textToImage,
		path: '/settings/providers/image',
		labelKey: 'settings.modelServices.imageAssistantName',
		descriptionKey: 'settings.modelServices.imageAssistantDescription',
		keywords: 'image generation prompt creative model',
		icon: ImageIcon,
	},
	{
		id: AGENTS.embedding,
		path: '/settings/providers/embedding',
		labelKey: 'settings.modelServices.embeddingName',
		descriptionKey: 'settings.modelServices.embeddingDescription',
		keywords: 'embedding embeddings vector rag retrieval search index model',
		icon: Binary,
	},
	{
		id: AGENTS.textToVideo,
		path: '/settings/providers/video',
		labelKey: 'settings.modelServices.videoCreatorName',
		descriptionKey: 'settings.modelServices.videoCreatorDescription',
		keywords: 'text to video generation model',
		icon: Video,
	},
	{
		id: AGENTS.textToAudio,
		path: '/settings/providers/music',
		labelKey: 'settings.modelServices.musicCreatorName',
		descriptionKey: 'settings.modelServices.musicCreatorDescription',
		keywords: 'music audio generation creator model',
		icon: Music,
	},
] as const;

export interface SettingsProviderConfigItem {
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly icon: LucideIcon;
	readonly comingSoon?: boolean;
}

export const SETTINGS_PROVIDER_CONFIG_ITEMS: readonly SettingsProviderConfigItem[] = [
	{
		path: '/settings/storage',
		labelKey: 'settings.tabs.storage',
		descriptionKey: 'settings.overview.descriptions.storage',
		icon: Folder,
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.tabs.channels',
		descriptionKey: 'settings.overview.descriptions.channels',
		icon: RadioTower,
	},
] as const;

export const SETTINGS_DETAIL_ITEMS: readonly SettingsDetailItem[] = [
	// General
	{
		path: '/settings/application',
		labelKey: 'settings.language.title',
		descriptionKey: 'settings.language.description',
		keywords: 'locale english italian i18n',
	},
	{
		path: '/settings/application',
		labelKey: 'settings.application.menuBar',
		descriptionKey: 'settings.application.menuBarDescription',
		keywords: 'tray dock icon toggle',
	},
	{
		path: '/settings/application',
		labelKey: 'settings.application.appData',
		descriptionKey: 'settings.application.appDataDescription',
		keywords: 'folder files storage',
	},
	// Application
	{
		path: '/settings/application',
		labelKey: 'settings.theme.title',
		keywords: 'appearance dark light system mode',
	},
	// System — permissions
	{
		path: '/settings/system',
		labelKey: 'settings.microphone.title',
		descriptionKey: 'settings.microphone.systemPermissionDescription',
		keywords: 'microphone audio recorder permission activate disable',
	},
	{
		path: '/settings/system',
		labelKey: 'settings.camera.title',
		descriptionKey: 'settings.camera.systemPermissionDescription',
		keywords: 'camera webcam video permission activate disable',
	},
	{
		path: '/settings/system',
		labelKey: 'settings.application.accessibility',
		descriptionKey: 'settings.application.accessibilityDescription',
		keywords: 'permission system',
	},
	{
		path: '/settings/system',
		labelKey: 'settings.application.screenRecording',
		descriptionKey: 'settings.application.screenRecordingDescription',
		keywords: 'permission capture screen',
	},
	{
		path: '/settings/system',
		labelKey: 'settings.system.capabilities.title',
		descriptionKey: 'settings.system.capabilities.description',
		keywords:
			'windows files network webcam microphone audio bluetooth usb printer scanner clipboard notifications gps location system information drivers daemons hardware',
	},
	// Providers — API keys
	{
		path: '/settings/providers/keys',
		labelKey: 'settings.providers.modelsApiKeys',
		descriptionKey: 'settings.providers.storeApiKeysDescription',
		keywords: 'api key secret token anthropic openai google provider',
		icon: Server,
	},
	// Search engines
	{
		path: '/settings/search',
		labelKey: 'settings.searchEngine.braveName',
		descriptionKey: 'settings.searchEngine.braveDescription',
		keywords: 'brave web search api key',
	},
	{
		path: '/settings/search',
		labelKey: 'settings.searchEngine.tavilyName',
		descriptionKey: 'settings.searchEngine.tavilyDescription',
		keywords: 'tavily web search api key',
	},
	// Storage
	{
		path: '/settings/storage',
		labelKey: 'settings.storage.connectionTitle',
		descriptionKey: 'settings.storage.connectionDescription',
		keywords: 's3 object storage endpoint region bucket url minio aws provider',
	},
	{
		path: '/settings/storage',
		labelKey: 'settings.storage.credentialsTitle',
		keywords: 'access key id secret access key api credentials token',
	},
	{
		path: '/settings/storage',
		labelKey: 'settings.storage.forcePathStyle',
		descriptionKey: 'settings.storage.forcePathStyleDescription',
		keywords: 'minio path style option compatible',
	},
	// MCP
	{
		path: '/settings/mcp',
		labelKey: 'settings.mcp.title',
		descriptionKey: 'settings.mcp.description',
		keywords: 'model context protocol server external tools remote local stdio sse http',
	},
	{
		path: '/settings/mcp',
		labelKey: 'settings.mcp.addServer',
		descriptionKey: 'settings.mcp.emptyDescription',
		keywords: 'new mcp server command url transport connect',
	},
	// Extensions
	{
		path: '/settings/extensions',
		labelKey: 'settings.extensions.title',
		descriptionKey: 'settings.extensions.description',
		keywords: 'external extension apps window manifest api install folder entry',
	},
	// Channels
	{
		path: '/settings/channels',
		labelKey: 'settings.channels.enabled',
		descriptionKey: 'settings.channels.enabledDescription',
		keywords: 'toggle on off activate',
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.channels.token',
		descriptionKey: 'settings.channels.tokenDescription',
		keywords: 'bot secret key telegram discord',
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.channels.dmPolicy',
		descriptionKey: 'settings.channels.dmPolicyDescription',
		keywords: 'allowlist open pairing deny direct message',
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.channels.allowFrom',
		descriptionKey: 'settings.channels.allowFromDescription',
		keywords: 'whitelist users allowed senders',
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.channels.status',
		keywords: 'connected disconnected runtime start stop',
	},
	// Skills
	{
		path: '/settings/skills',
		labelKey: 'settings.skills.title',
		keywords: 'plugins import folder delete refresh',
	},
	// Tasks
	{
		path: '/settings/tasks',
		labelKey: 'settings.cron.runtime.title',
		descriptionKey: 'settings.cron.runtime.description',
		keywords: 'scheduled agent provider model runtime',
	},
	{
		path: '/settings/tasks',
		labelKey: 'settings.cron.schedulesTitle',
		descriptionKey: 'settings.cron.schedulesDescription',
		keywords: 'cron schedule recurring task',
	},
	// Policies
	{
		path: '/settings/assistant/policies',
		labelKey: 'settings.policies.toolsTitle',
		descriptionKey: 'settings.policies.toolsDescription',
		keywords: 'policy permission directory recursive tool write edit exec allow deny ask',
	},
	// Health
	{
		path: '/settings/assistant/health',
		labelKey: 'settings.health.settingsTitle',
		descriptionKey: 'settings.health.settingsDescription',
		keywords: 'periodic health check interval provider model',
	},
	{
		path: '/settings/assistant/health',
		labelKey: 'settings.health.checklistTitle',
		descriptionKey: 'settings.health.checklistDescription',
		keywords: 'health checklist instructions agent HEALTH.md',
	},
	// Model services
	...SETTINGS_MODEL_SERVICE_ITEMS,
	{
		path: '/settings/assistant/chathistory',
		labelKey: 'settings.chatHistory.title',
		descriptionKey: 'settings.chatHistory.description',
		keywords: 'chat history transcript messages context delete clear folder',
		icon: Bot,
	},
] as const;

export const SETTINGS_NAVIGATION = [
	{
		path: '/settings/application',
		labelKey: 'settings.tabs.application',
		descriptionKey: 'settings.overview.descriptions.application',
		icon: Info,
	},
	{
		path: '/settings/system',
		labelKey: 'settings.tabs.system',
		descriptionKey: 'settings.overview.descriptions.system',
		icon: MonitorCog,
	},
	{
		path: '/settings/providers',
		labelKey: 'settings.tabs.providers',
		descriptionKey: 'settings.overview.descriptions.providers',
		icon: Server,
	},
	{
		path: '/settings/search',
		labelKey: 'settings.tabs.searchEngine',
		descriptionKey: 'settings.overview.descriptions.searchEngine',
		icon: Search,
	},
	{
		path: '/settings/storage',
		labelKey: 'settings.tabs.storage',
		descriptionKey: 'settings.overview.descriptions.storage',
		icon: Folder,
	},
	{
		path: '/settings/database',
		labelKey: 'settings.tabs.database',
		descriptionKey: 'settings.overview.descriptions.database',
		icon: Database,
		comingSoon: true,
	},
	{
		path: '/settings/rag',
		labelKey: 'settings.tabs.rag',
		descriptionKey: 'settings.overview.descriptions.rag',
		icon: Library,
	},
	{
		path: '/settings/wiki',
		labelKey: 'settings.tabs.wiki',
		descriptionKey: 'settings.overview.descriptions.wiki',
		icon: BookOpenText,
	},
	{
		path: '/settings/vectordb',
		labelKey: 'settings.tabs.vectorDb',
		descriptionKey: 'settings.overview.descriptions.vectorDb',
		icon: Boxes,
	},
	{
		path: '/settings/skills',
		labelKey: 'settings.tabs.skills',
		descriptionKey: 'settings.overview.descriptions.skills',
		icon: Sparkles,
	},
	{
		path: '/settings/mcp',
		labelKey: 'settings.tabs.mcp',
		descriptionKey: 'settings.overview.descriptions.mcp',
		icon: Plug,
	},
	{
		path: '/settings/tasks',
		labelKey: 'settings.tabs.taskScheduler',
		descriptionKey: 'settings.overview.descriptions.cron',
		icon: ListChecks,
	},
	{
		path: '/settings/assistant/health',
		labelKey: 'settings.tabs.health',
		descriptionKey: 'settings.overview.descriptions.health',
		icon: HeartPulse,
	},
	{
		path: '/settings/assistant/policies',
		labelKey: 'settings.tabs.policies',
		descriptionKey: 'settings.overview.descriptions.policies',
		icon: ShieldCheck,
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.tabs.channels',
		descriptionKey: 'settings.overview.descriptions.channels',
		icon: RadioTower,
	},
	{
		path: '/settings/extensions',
		labelKey: 'settings.tabs.extensions',
		descriptionKey: 'settings.overview.descriptions.extensions',
		icon: Blocks,
	},
	{
		path: '/settings/plugins',
		labelKey: 'settings.tabs.plugins',
		descriptionKey: 'settings.overview.descriptions.plugins',
		icon: Puzzle,
	},
] satisfies readonly SettingsNavigationItem[];
