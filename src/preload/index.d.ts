export type * from '../shared/api_types';

import type {
	AgentApi,
	AppApi,
	RecorderApi,
	CronApi,
	McpApi,
	ModelsApi,
	ProviderApi,
	SearchApi,
	SkillsApi,
	StorageApi,
	DatabaseApi,
	ExtensionsApi,
	WikiApi,
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
		models: ModelsApi;
		storage: StorageApi;
		database: DatabaseApi;
		provider: ProviderApi;
		search: SearchApi;
		extensions: ExtensionsApi;
		wiki: WikiApi;
	}
}
