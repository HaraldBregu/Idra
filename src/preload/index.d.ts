export type * from '../shared/api_types';

import type {
	AgentApi,
	AppApi,
	RecorderApi,
	TaskApi,
	McpApi,
	ModelsApi,
	ProviderApi,
	SearchApi,
	EmailApi,
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
		tasks: TaskApi;
		skills: SkillsApi;
		mcp: McpApi;
		models: ModelsApi;
		storage: StorageApi;
		database: DatabaseApi;
		provider: ProviderApi;
		search: SearchApi;
		email: EmailApi;
		extensions: ExtensionsApi;
		wiki: WikiApi;
	}
}
