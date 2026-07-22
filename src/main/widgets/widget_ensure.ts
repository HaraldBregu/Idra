import { existsSync, mkdirSync } from 'node:fs';
import { listWidgets } from './widget_list';
import { widgetsRoot } from './widget_root';
import { widgetsSettingsPath } from './widget_settings';
import { storeWidgets } from './widget_store';
import type { WidgetConfiguration } from './widget_types';

export function ensureWidgets(appLocation?: string): WidgetConfiguration[] {
	mkdirSync(widgetsRoot(appLocation), { recursive: true });
	if (!existsSync(widgetsSettingsPath(appLocation))) storeWidgets([], appLocation);
	return listWidgets(appLocation);
}
