import path from 'node:path';
import { extensionsRoot } from './extension_root';

export function extensionsSettingsPath(appLocation?: string): string {
	return path.join(extensionsRoot(appLocation), 'settings.json');
}
