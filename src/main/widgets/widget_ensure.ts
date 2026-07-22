import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_WIDGET_PAGES, DEFAULT_WIDGETS } from './widget_defaults';
import { listWidgets } from './widget_list';
import { widgetPagePath } from './widget_page';
import { widgetsRoot } from './widget_root';
import { widgetsSettingsPath } from './widget_settings';
import { storeWidgets } from './widget_store';
import type { WidgetConfiguration } from './widget_types';

export function ensureWidgets(
	appLocation?: string,
	defaultPages: Readonly<Record<string, string>> = DEFAULT_WIDGET_PAGES
): WidgetConfiguration[] {
	const hasSettings = existsSync(widgetsSettingsPath(appLocation));
	const widgets = hasSettings ? listWidgets(appLocation) : [...DEFAULT_WIDGETS];
	mkdirSync(widgetsRoot(appLocation), { recursive: true });

	for (const widget of widgets) {
		const source = defaultPages[widget.id];
		const destination = widgetPagePath(widget.id, appLocation);
		if (!source || existsSync(destination)) continue;
		mkdirSync(path.dirname(destination), { recursive: true });
		copyFileSync(source, destination);
	}

	if (!hasSettings) storeWidgets(widgets, appLocation);
	return widgets;
}
