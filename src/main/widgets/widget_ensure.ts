import { mkdirSync } from 'node:fs';
import { listWidgets } from './widget_list';
import { widgetsRoot } from './widget_root';
import { readWidgetSettings } from './widget_settings_read';
import { storeWidgetSettings } from './widget_store';
import type { Widget } from './widget_types';

export function ensureWidgets(appLocation?: string): Widget[] {
	mkdirSync(widgetsRoot(appLocation), { recursive: true });
	storeWidgetSettings(readWidgetSettings(appLocation), appLocation);
	return listWidgets(appLocation);
}
