import {
	Activity,
	AppWindow,
	Bot,
	CalendarClock,
	ClipboardList,
	Clock3,
	ImageIcon,
	Info,
	Mic,
	MonitorCog,
	Music,
	Plug,
	RadioTower,
	ScanText,
	Server,
	Sparkles,
	Video,
	Volume2,
	type LucideIcon,
} from 'lucide-react';
import {
	BACKGROUND_TASK_OPERATOR_ID,
	CRON_TASK_SCHEDULER_OPERATOR_ID,
	DOCUMENT_READER_OCR_OPERATOR_ID,
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	VIDEO_CREATOR_OPERATOR_ID,
} from '../../../../shared/service';

export interface SettingsNavigationItem {
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly icon: LucideIcon;
}

export interface SettingsDetailItem {
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey?: string;
	readonly keywords?: string;
	readonly icon?: LucideIcon;
}

export interface SettingsOperatorItem {
	readonly id: string;
	readonly path: string;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly keywords: string;
	readonly icon: LucideIcon;
}

export const SETTINGS_OPERATOR_ITEMS: readonly SettingsOperatorItem[] = [
	{
		id: 'friday',
		path: '/settings/operators/friday/details',
		labelKey: 'settings.operators.fridayName',
		descriptionKey: 'settings.operators.fridayDescription',
		keywords: 'friday operator default provider model',
		icon: Bot,
	},
	{
		id: SPEECH_TO_TEXT_OPERATOR_ID,
		path: `/settings/operators/${SPEECH_TO_TEXT_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.speechTranscriberName',
		descriptionKey: 'settings.operators.speechTranscriberDescription',
		keywords: 'speech transcription transcribe audio voice microphone model',
		icon: Mic,
	},
	{
		id: TEXT_TO_SPEECH_OPERATOR_ID,
		path: `/settings/operators/${TEXT_TO_SPEECH_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.textToSpeechName',
		descriptionKey: 'settings.operators.textToSpeechDescription',
		keywords: 'text to speech tts voice output speaking audio model',
		icon: Volume2,
	},
	{
		id: IMAGE_CREATOR_OPERATOR_ID,
		path: `/settings/operators/${IMAGE_CREATOR_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.imageAssistantName',
		descriptionKey: 'settings.operators.imageAssistantDescription',
		keywords: 'image generation image assistant editing creative model',
		icon: ImageIcon,
	},
	{
		id: VIDEO_CREATOR_OPERATOR_ID,
		path: `/settings/operators/${VIDEO_CREATOR_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.videoCreatorName',
		descriptionKey: 'settings.operators.videoCreatorDescription',
		keywords: 'video generation creator model',
		icon: Video,
	},
	{
		id: MUSIC_CREATOR_OPERATOR_ID,
		path: `/settings/operators/${MUSIC_CREATOR_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.musicCreatorName',
		descriptionKey: 'settings.operators.musicCreatorDescription',
		keywords: 'music audio generation creator model',
		icon: Music,
	},
	{
		id: DOCUMENT_READER_OCR_OPERATOR_ID,
		path: `/settings/operators/${DOCUMENT_READER_OCR_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.documentReaderName',
		descriptionKey: 'settings.operators.documentReaderDescription',
		keywords: 'ocr document reader text extraction scan model',
		icon: ScanText,
	},
	{
		id: CRON_TASK_SCHEDULER_OPERATOR_ID,
		path: `/settings/operators/${CRON_TASK_SCHEDULER_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.cronTaskName',
		descriptionKey: 'settings.operators.cronTaskDescription',
		keywords: 'cron schedule recurring task operator',
		icon: Clock3,
	},
	{
		id: BACKGROUND_TASK_OPERATOR_ID,
		path: `/settings/operators/${BACKGROUND_TASK_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.backgroundTaskName',
		descriptionKey: 'settings.operators.backgroundTaskDescription',
		keywords: 'background task queue agent run ocr operator',
		icon: ClipboardList,
	},
] as const;

export const SETTINGS_DETAIL_ITEMS: readonly SettingsDetailItem[] = [
	// General — appearance
	{ path: '/settings/general', labelKey: 'settings.theme.title', descriptionKey: 'settings.theme.description', keywords: 'dark light color appearance mode' },
	{ path: '/settings/general', labelKey: 'settings.language.title', descriptionKey: 'settings.language.description', keywords: 'locale english italian i18n' },
	{ path: '/settings/general', labelKey: 'settings.translucency.title', descriptionKey: 'settings.translucency.description', keywords: 'blur opacity window backdrop vibrancy' },
	{ path: '/settings/general', labelKey: 'settings.application.menuBar', descriptionKey: 'settings.application.menuBarDescription', keywords: 'tray dock icon toggle' },
	{ path: '/settings/general', labelKey: 'settings.application.appData', descriptionKey: 'settings.application.appDataDescription', keywords: 'folder files storage' },
	{ path: '/settings/general', labelKey: 'settings.application.userData', descriptionKey: 'settings.application.userDataDescription', keywords: 'folder files storage' },
	// System — permissions & folders
	{ path: '/settings/system', labelKey: 'settings.application.accessibility', descriptionKey: 'settings.application.accessibilityDescription', keywords: 'permission system' },
	{ path: '/settings/system', labelKey: 'settings.application.screenRecording', descriptionKey: 'settings.application.screenRecordingDescription', keywords: 'permission capture screen' },
	{ path: '/settings/system', labelKey: 'settings.microphone.title', descriptionKey: 'settings.microphone.description', keywords: 'microphone audio recorder permission activate disable' },
	{ path: '/settings/system', labelKey: 'settings.application.keepAwake', descriptionKey: 'settings.application.keepAwakeDescription', keywords: 'awake sleep power save blocker active suspension background' },
	// Providers — API keys
	{ path: '/settings/providers', labelKey: 'settings.providers.keySaved', keywords: 'api key anthropic openai google' },
	{ path: '/settings/providers', labelKey: 'settings.providers.apiKeyPlaceholder', keywords: 'api key secret token' },
	// Channels
	{ path: '/settings/channels', labelKey: 'settings.channels.enabled', descriptionKey: 'settings.channels.enabledDescription', keywords: 'toggle on off activate' },
	{ path: '/settings/channels', labelKey: 'settings.channels.token', descriptionKey: 'settings.channels.tokenDescription', keywords: 'bot secret key telegram discord' },
	{ path: '/settings/channels', labelKey: 'settings.channels.dmPolicy', descriptionKey: 'settings.channels.dmPolicyDescription', keywords: 'allowlist open pairing deny direct message' },
	{ path: '/settings/channels', labelKey: 'settings.channels.allowFrom', descriptionKey: 'settings.channels.allowFromDescription', keywords: 'whitelist users allowed senders' },
	{ path: '/settings/channels', labelKey: 'settings.channels.status', keywords: 'connected disconnected runtime start stop' },
	// Skills
	{ path: '/settings/skills', labelKey: 'settings.skills.title', keywords: 'plugins import folder delete refresh' },
	// Apps
	{ path: '/settings/apps', labelKey: 'settings.apps.title', keywords: 'installed packages manifests folder delete' },
	// Operators
	...SETTINGS_OPERATOR_ITEMS,
	{ path: '/settings/operators/friday/details/chathistory', labelKey: 'settings.chatHistory.title', descriptionKey: 'settings.chatHistory.description', keywords: 'chat history transcript messages context delete clear folder', icon: Bot },
	// Cron
	{ path: '/settings/cron', labelKey: 'settings.sections.cron', keywords: 'schedule recurring task expression timezone' },
	// Task manager
	{ path: '/settings/task-manager', labelKey: 'settings.tabs.taskManager', descriptionKey: 'settings.taskManager.description', keywords: 'tasks running queued succeeded failed background' },
	// Heartbeat
	{ path: '/settings/heartbeat', labelKey: 'settings.sections.heartbeat', keywords: 'heartbeat periodic wake manual system event status' },
] as const;

export const SETTINGS_NAVIGATION = [
	{
		path: '/settings/general',
		labelKey: 'settings.tabs.general',
		descriptionKey: 'settings.overview.descriptions.general',
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
		path: '/settings/operators',
		labelKey: 'settings.tabs.operators',
		descriptionKey: 'settings.overview.descriptions.operators',
		icon: Bot,
	},
	{
		path: '/settings/skills',
		labelKey: 'settings.tabs.skills',
		descriptionKey: 'settings.overview.descriptions.skills',
		icon: Sparkles,
	},
	{
		path: '/settings/connectors',
		labelKey: 'settings.tabs.connectors',
		descriptionKey: 'settings.overview.descriptions.connectors',
		icon: Plug,
	},
	{
		path: '/settings/channels',
		labelKey: 'settings.tabs.channels',
		descriptionKey: 'settings.overview.descriptions.channels',
		icon: RadioTower,
	},
	{
		path: '/settings/heartbeat',
		labelKey: 'settings.tabs.heartbeat',
		descriptionKey: 'settings.overview.descriptions.heartbeat',
		icon: Activity,
	},
	{
		path: '/settings/cron',
		labelKey: 'settings.tabs.cron',
		descriptionKey: 'settings.overview.descriptions.cron',
		icon: CalendarClock,
	},
	{
		path: '/settings/task-manager',
		labelKey: 'settings.tabs.taskManager',
		descriptionKey: 'settings.overview.descriptions.taskManager',
		icon: ClipboardList,
	},
	{
		path: '/settings/apps',
		labelKey: 'settings.tabs.apps',
		descriptionKey: 'settings.overview.descriptions.apps',
		icon: AppWindow,
	},
] satisfies readonly SettingsNavigationItem[];
