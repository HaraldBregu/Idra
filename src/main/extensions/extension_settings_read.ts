import { existsSync, readFileSync } from 'node:fs';
import { extensionsSettingsPath } from './extension_settings';
import type { ExtensionSettings } from './extension_types';

export function readExtensionSettings(appLocation?: string): ExtensionSettings {
	const file = extensionsSettingsPath(appLocation);
	if (!existsSync(file)) return { enabled: true };
	try {
		const value = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
		return typeof value.enabled === 'boolean' ? { enabled: value.enabled } : { enabled: true };
	} catch {
		return { enabled: true };
	}
}
