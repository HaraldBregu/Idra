import { mkdirSync } from 'node:fs';
import { listExtensions } from './extension_list';
import { extensionsRoot } from './extension_root';
import { readExtensionSettings } from './extension_settings_read';
import { storeExtensionSettings } from './extension_store';
import type { Extension } from './extension_types';

export function ensureExtensions(appLocation?: string): Extension[] {
	mkdirSync(extensionsRoot(appLocation), { recursive: true });
	storeExtensionSettings(readExtensionSettings(appLocation), appLocation);
	return listExtensions(appLocation);
}
