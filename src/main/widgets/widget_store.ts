import { mkdirSync, writeFileSync } from 'node:fs';
import { extensionsRoot } from './extension_root';
import { extensionsSettingsPath } from './extension_settings';
import type { ExtensionSettings } from './extension_types';

export function storeExtensionSettings(settings: ExtensionSettings, appLocation?: string): void {
	mkdirSync(extensionsRoot(appLocation), { recursive: true });
	writeFileSync(
		extensionsSettingsPath(appLocation),
		`${JSON.stringify({ enabled: settings.enabled }, null, '\t')}\n`,
		'utf8'
	);
}
