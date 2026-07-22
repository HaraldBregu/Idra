import path from 'node:path';
import { widgetsRoot } from './widget_root';

export function widgetsSettingsPath(appLocation?: string): string {
	return path.join(widgetsRoot(appLocation), 'settings.json');
}
