import type {
	AgentApi,
	AppApi,
	ChannelsApi,
	CronApi,
	McpApi,
	ModelsApi,
	ProviderApi,
	RecorderApi,
	SearchApi,
	SkillsApi,
	StorageApi,
	ExtensionsApi,
	WikiApi,
	WindowApi,
} from '../../src/shared/api_types';

export { connect, type ConnectOptions, type FridayClient } from './connect';

export type * from '../../src/shared';
export type * from '../../src/shared/api_types';
export type * from '../../src/shared/agent_types';
export type * from '../../src/shared/embedding_types';
export type * from '../../src/shared/image_types';
export type * from '../../src/shared/recorder_types';
export type * from '../../src/shared/sound_types';
export type * from '../../src/shared/speech_types';
export type * from '../../src/shared/storage_types';
export type * from '../../src/shared/text_types';
export type * from '../../src/shared/video_types';
export type * from '../../src/shared/extension_types';
export type * from '../../src/shared/wiki_types';
export type * from '../../src/main/app/cron/cron_types';
export type * from '../../src/main/agent/health/health_types';
export type * from '../../src/main/agent/policy/policy_types';

// ponytail: the app exposes each API as a global via the Electron preload, so the
// SDK is a typed lazy view over those globals — no transport of its own.
function bridge<T extends object>(name: string): T {
	return new Proxy({} as T, {
		get(_target, key) {
			const api = (globalThis as Record<string, unknown>)[name] as
				| Record<string | symbol, unknown>
				| undefined;
			if (!api)
				throw new Error(
					`@friday/sdk: "${name}" is unavailable — this code must run inside the Friday app.`
				);
			const value = api[key];
			return typeof value === 'function' ? value.bind(api) : value;
		},
	});
}

export function isFriday(): boolean {
	return typeof (globalThis as Record<string, unknown>).agent === 'object';
}

export const agent = bridge<AgentApi>('agent');
export const app = bridge<AppApi>('app');
export const channels = bridge<ChannelsApi>('channels');
export const cron = bridge<CronApi>('cron');
export const mcp = bridge<McpApi>('mcp');
export const models = bridge<ModelsApi>('models');
export const provider = bridge<ProviderApi>('provider');
export const recorder = bridge<RecorderApi>('recorder');
export const search = bridge<SearchApi>('search');
export const skills = bridge<SkillsApi>('skills');
export const storage = bridge<StorageApi>('storage');
export const extensions = bridge<ExtensionsApi>('extensions');
export const wiki = bridge<WikiApi>('wiki');
export const win = bridge<WindowApi>('win');
