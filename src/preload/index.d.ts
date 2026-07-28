export type * from '../shared/api_types';

import type {
	AgentApi,
	AppApi,
	RecorderApi,
	ChannelsApi,
	CronApi,
	McpApi,
	ModelsApi,
	ProviderApi,
	SearchApi,
	SkillsApi,
	StorageApi,
	WidgetsApi,
	WindowApi,
} from '../shared/api_types';

declare global {
	interface Window {
		win: WindowApi;
		app: AppApi;
		agent: AgentApi;
		recorder: RecorderApi;
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
