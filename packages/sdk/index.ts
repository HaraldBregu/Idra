import type { AppApi } from '../../src/shared/api_types';
import type { AppThemeData, AppTheme, AppLanguage } from '../../src/shared/app_types';

export { connect, type ConnectOptions, type FridayClient } from './connect';

export type * from '../../src/shared/api_types';
export type { AppApi, AppTheme, AppThemeData, AppLanguage };

// The SDK is now scoped to app-level data only.
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

export function isFriday(): boolean {
	return typeof (globalThis as Record<string, unknown>).app === 'object';
}

export const app = bridge<AppApi>('app');
