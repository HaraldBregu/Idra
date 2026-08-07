import type { AgentApi, AppApi } from '../../src/shared/api_types';
import type { AppLanguage, AppTheme, AppThemeColors, AppThemeData } from '../../src/shared/app_types';

export { connect, type ConnectOptions, type FridayClient, type WorkspaceAgentApi } from './connect';
export type { AgentApi, AppApi, AppTheme, AppThemeColors, AppThemeData, AppLanguage };

// The SDK is scoped to app-level data only.
// This is a typed lazy view over the host preload globals.
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

export const app = bridge<AppApi>('app');
export const agent = bridge<AgentApi>('agent');

const requiredMethods = [
	'getThemeData',
	'setTheme',
	'getLanguage',
	'setLanguage',
	'onThemeModeChanged',
] as const;

function hasAppMethods(api: unknown): api is AppApi {
	if (typeof api !== 'object' || api === null) return false;
	for (const method of requiredMethods) {
		if (typeof (api as Record<string, unknown>)[method] !== 'function') return false;
	}
	return true;
}

export function isFriday(): boolean {
	const fridayApp = (globalThis as Record<string, unknown>).app;
	return hasAppMethods(fridayApp);
}
