import {
	Activity,
	AppWindow,
	CalendarClock,
	Info,
	Plug,
	RadioTower,
	Server,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';
import {
	IMAGE_ASSISTANT_AGENT_ID,
	SPEECH_TRANSCRIBER_AGENT_ID,
	TEXT_TO_SPEECH_AGENT_ID,
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
}

export const SETTINGS_DETAIL_ITEMS: readonly SettingsDetailItem[] = [
	// General — permissions & folders
	{ path: '/settings/general', labelKey: 'settings.application.accessibility', descriptionKey: 'settings.application.accessibilityDescription', keywords: 'permission system' },
	{ path: '/settings/general', labelKey: 'settings.application.screenRecording', descriptionKey: 'settings.application.screenRecordingDescription', keywords: 'permission capture screen' },
	{ path: '/settings/general', labelKey: 'settings.microphone.title', descriptionKey: 'settings.microphone.description', keywords: 'microphone audio recorder permission activate disable' },
	{ path: '/settings/general', labelKey: 'settings.application.menuBar', descriptionKey: 'settings.application.menuBarDescription', keywords: 'tray dock icon toggle' },
	{ path: '/settings/general', labelKey: 'settings.application.keepAwake', descriptionKey: 'settings.application.keepAwakeDescription', keywords: 'awake sleep power save blocker active suspension background' },
	{ path: '/settings/general', labelKey: 'settings.application.appData', descriptionKey: 'settings.application.appDataDescription', keywords: 'folder files storage' },
	{ path: '/settings/general', labelKey: 'settings.application.userData', descriptionKey: 'settings.application.userDataDescription', keywords: 'folder files storage' },
	// General — appearance
	{ path: '/settings/general', labelKey: 'settings.theme.title', descriptionKey: 'settings.theme.description', keywords: 'dark light color appearance mode' },
	{ path: '/settings/general', labelKey: 'settings.language.title', descriptionKey: 'settings.language.description', keywords: 'locale english italian i18n' },
	{ path: '/settings/general', labelKey: 'settings.translucency.title', descriptionKey: 'settings.translucency.description', keywords: 'blur opacity window backdrop vibrancy' },
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
	// Agents
	{ path: '/settings/general/agentdetails/main', labelKey: 'settings.agents.title', descriptionKey: 'settings.agents.fridayDescription', keywords: 'friday main agent default provider model' },
	{ path: `/settings/general/agentdetails/${SPEECH_TRANSCRIBER_AGENT_ID}`, labelKey: 'settings.agents.speechTranscriberName', descriptionKey: 'settings.agents.speechTranscriberDescription', keywords: 'speech transcription transcribe audio voice microphone model' },
	{ path: `/settings/general/agentdetails/${TEXT_TO_SPEECH_AGENT_ID}`, labelKey: 'settings.agents.textToSpeechName', descriptionKey: 'settings.agents.textToSpeechDescription', keywords: 'text to speech tts voice output speaking audio model' },
	{ path: `/settings/general/agentdetails/${IMAGE_ASSISTANT_AGENT_ID}`, labelKey: 'settings.agents.imageAssistantName', descriptionKey: 'settings.agents.imageAssistantDescription', keywords: 'image assistant generation editing creative model' },
	// Cron
	{ path: '/settings/cron', labelKey: 'settings.sections.cron', keywords: 'schedule recurring task expression timezone' },
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
		path: '/settings/channels',
		labelKey: 'settings.tabs.channels',
		descriptionKey: 'settings.overview.descriptions.channels',
		icon: RadioTower,
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
		path: '/settings/providers',
		labelKey: 'settings.tabs.providers',
		descriptionKey: 'settings.overview.descriptions.providers',
		icon: Server,
	},
	{
		path: '/settings/cron',
		labelKey: 'settings.tabs.cron',
		descriptionKey: 'settings.overview.descriptions.cron',
		icon: CalendarClock,
	},
	{
		path: '/settings/heartbeat',
		labelKey: 'settings.tabs.heartbeat',
		descriptionKey: 'settings.overview.descriptions.heartbeat',
		icon: Activity,
	},
	{
		path: '/settings/apps',
		labelKey: 'settings.tabs.apps',
		descriptionKey: 'settings.overview.descriptions.apps',
		icon: AppWindow,
	},
] satisfies readonly SettingsNavigationItem[];
