import { existsSync, mkdirSync } from 'node:fs';
import { listWidgets } from './widget_list';
import { widgetsRoot } from './widget_root';
import { widgetsSettingsPath } from './widget_settings';
import { storeWidgetSettings } from './widget_store';
import type { Widget } from './widget_types';

export function ensureWidgets(appLocation?: string): Widget[] {
	mkdirSync(widgetsRoot(appLocation), { recursive: true });
	if (!existsSync(widgetsSettingsPath(appLocation))) {
		storeWidgetSettings({ enabled: true }, appLocation);
	}
	return listWidgets(appLocation);
}
