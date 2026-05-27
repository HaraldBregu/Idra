import {
	Activity,
	Bot,
	CalendarClock,
	ClipboardList,
	ImageIcon,
	Info,
	Mic,
	MonitorCog,
	Music,
	Plug,
	Radar,
	RadioTower,
	Server,
	ShieldCheck,
	Sparkles,
	Video,
	Volume2,
	Wrench,
	type LucideIcon,
} from 'lucide-react';
import {
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_VIDEO_OPERATOR_ID,
} from '../../../../shared/agents/service';

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
	readonly comingSoon?: boolean;
}

export const SETTINGS_OPERATOR_ITEMS: readonly SettingsOperatorItem[] = [
	{
		id: 'friday',
		path: '/settings/operators/friday/details',
		labelKey: 'settings.operators.assistantName',
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
		comingSoon: true,
	},
	{
		id: IMAGE_CREATOR_OPERATOR_ID,
		path: `/settings/operators/${IMAGE_CREATOR_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.imageAssistantName',
		descriptionKey: 'settings.operators.imageAssistantDescription',
		keywords: 'image generation image assistant editing creative model',
		icon: ImageIcon,
		comingSoon: true,
	},
	{
		id: TEXT_TO_VIDEO_OPERATOR_ID,
		path: `/settings/operators/${TEXT_TO_VIDEO_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.videoCreatorName',
		descriptionKey: 'settings.operators.videoCreatorDescription',
		keywords: 'text to video generation model',
		icon: Video,
		comingSoon: true,
	},
	{
		id: MUSIC_CREATOR_OPERATOR_ID,
		path: `/settings/operators/${MUSIC_CREATOR_OPERATOR_ID}/details`,
		labelKey: 'settings.operators.musicCreatorName',
		descriptionKey: 'settings.operators.musicCreatorDescription',
		keywords: 'music audio generation creator model',
		icon: Music,
		comingSoon: true,
	},
] as const;

export const SETTINGS_DETAIL_ITEMS: readonly SettingsDetailItem[] = [
	// General — appearance
	{ path: '/settings/general', labelKey: 'settings.language.title', descriptionKey: 'settings.language.description', keywords: 'locale english italian i18n' },
	{ path: '/settings/general', labelKey: 'settings.application.menuBar', descriptionKey: 'settings.application.menuBarDescription', keywords: 'tray dock icon toggle' },
	{ path: '/settings/general', labelKey: 'settings.application.appData', descriptionKey: 'settings.application.appDataDescription', keywords: 'folder files storage' },
	{ path: '/settings/general', labelKey: 'settings.application.userData', descriptionKey: 'settings.application.userDataDescription', keywords: 'folder files storage' },
	// System — permissions & folders
	{ path: '/settings/system', labelKey: 'settings.application.accessibility', descriptionKey: 'settings.application.accessibilityDescription', keywords: 'permission system' },
	{ path: '/settings/system', labelKey: 'settings.application.screenRecording', descriptionKey: 'settings.application.screenRecordingDescription', keywords: 'permission capture screen' },
	{ path: '/settings/system', labelKey: 'settings.microphone.title', descriptionKey: 'settings.microphone.description', keywords: 'microphone audio recorder permission activate disable' },
	{ path: '/settings/system', labelKey: 'settings.camera.title', descriptionKey: 'settings.camera.description', keywords: 'camera webcam video permission activate disable' },
	{ path: '/settings/system', labelKey: 'settings.application.keepAwake', descriptionKey: 'settings.application.keepAwakeDescription', keywords: 'awake sleep power save blocker active suspension background' },
	{ path: '/settings/system', labelKey: 'settings.system.capabilities.title', descriptionKey: 'settings.system.capabilities.description', keywords: 'windows files network webcam microphone audio bluetooth usb printer scanner clipboard notifications gps location system information drivers daemons hardware' },
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
	{ path: '/settings/tools', labelKey: 'settings.tabs.tools', descriptionKey: 'settings.overview.descriptions.tools', keywords: 'tools capabilities permissions approval mcp workspace skill' },
	{ path: '/settings/skills', labelKey: 'settings.skills.title', keywords: 'plugins import folder delete refresh' },
	// Operators
	...SETTINGS_OPERATOR_ITEMS,
	{ path: '/settings/operators/friday/details/chathistory', labelKey: 'settings.chatHistory.title', descriptionKey: 'settings.chatHistory.description', keywords: 'chat history transcript messages context delete clear folder', icon: Bot },
	// Cron
	{ path: '/settings/cron', labelKey: 'settings.sections.taskScheduler', keywords: 'cron schedule recurring task expression timezone' },
	// Task manager
	{ path: '/settings/task-manager', labelKey: 'settings.tabs.backgroundTasks', descriptionKey: 'settings.taskManager.description', keywords: 'tasks running queued succeeded failed background' },
	// Heartbeat
	{ path: '/settings/heartbeat', labelKey: 'settings.sections.heartbeat', keywords: 'heartbeat periodic wake manual system event status' },
	{ path: '/settings/monitoring', labelKey: 'settings.tabs.monitoring', descriptionKey: 'settings.monitoring.description', keywords: 'runtime monitoring diagnostics events errors warnings timeline payload' },
	{ path: '/settings/policies', labelKey: 'settings.tabs.policies', descriptionKey: 'settings.policies.description', keywords: 'policy policies permissions filesystem paths allow deny' },
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
		path: '/settings/tools',
		labelKey: 'settings.tabs.tools',
		descriptionKey: 'settings.overview.descriptions.tools',
		icon: Wrench,
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
		labelKey: 'settings.sections.taskScheduler',
		descriptionKey: 'settings.overview.descriptions.cron',
		icon: CalendarClock,
	},
	{
		path: '/settings/task-manager',
		labelKey: 'settings.tabs.backgroundTasks',
		descriptionKey: 'settings.overview.descriptions.taskManager',
		icon: ClipboardList,
	},
	{
		path: '/settings/monitoring',
		labelKey: 'settings.tabs.monitoring',
		descriptionKey: 'settings.overview.descriptions.monitoring',
		icon: Radar,
	},
	{
		path: '/settings/policies',
		labelKey: 'settings.tabs.policies',
		descriptionKey: 'settings.overview.descriptions.policies',
		icon: ShieldCheck,
	},
] satisfies readonly SettingsNavigationItem[];
