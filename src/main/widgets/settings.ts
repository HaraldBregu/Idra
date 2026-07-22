import path from 'node:path';
import { widgetsRoot } from './root';

export function widgetsSettingsPath(appLocation?: string): string {
	return path.join(widgetsRoot(appLocation), 'settings.json');
}
