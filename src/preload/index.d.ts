export type * from '../shared/api_types';

import type {
	AgentApi,
	AppApi,
	ChannelsApi,
	CronApi,
	ImageApi,
	McpApi,
	ProviderApi,
	SearchApi,
	SkillsApi,
	SoundApi,
	StorageApi,
	TextApi,
	TranscribeApi,
	VideoApi,
	VoiceApi,
	WidgetsApi,
	WindowApi,
} from '../shared/api_types';

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agent: AgentApi;
		cron: CronApi;
		skills: SkillsApi;
		mcp: McpApi;
		channels: ChannelsApi;
		storage: StorageApi;
		provider: ProviderApi;
		search: SearchApi;
		transcribe: TranscribeApi;
		voice: VoiceApi;
		image: ImageApi;
		video: VideoApi;
		sound: SoundApi;
		text: TextApi;
		widgets: WidgetsApi;
	}
}
