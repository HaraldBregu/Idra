import { existsSync, readFileSync } from 'node:fs';
import { widgetPagePath } from './widget_page';
import { readWidgetManifest } from './widget_read';
import { widgetsSettingsPath } from './widget_settings';
import { isWidgetConfiguration } from './widget_validate';
import type { Widget, WidgetsSettings } from './widget_types';

export function listWidgets(appLocation?: string): Widget[] {
	const file = widgetsSettingsPath(appLocation);
	if (!existsSync(file)) return [];

	try {
		const settings = JSON.parse(readFileSync(file, 'utf8')) as Partial<WidgetsSettings>;
		if (!Array.isArray(settings.widgets)) return [];
		const widgets: Widget[] = [];
		for (const configuration of settings.widgets.filter(isWidgetConfiguration)) {
			if (!existsSync(widgetPagePath(configuration.id, appLocation))) continue;
			const manifest = readWidgetManifest(configuration.id, appLocation);
			if (manifest) widgets.push({ id: configuration.id, ...manifest });
		}
		return widgets;
	} catch {
		return [];
	}
}
