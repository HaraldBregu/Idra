import { existsSync, readFileSync } from 'node:fs';
import { widgetPagePath } from './widget_page';
import { widgetsSettingsPath } from './widget_settings';
import { isWidgetConfiguration } from './widget_validate';
import type { WidgetConfiguration, WidgetsSettings } from './widget_types';

export function listWidgets(appLocation?: string): WidgetConfiguration[] {
	const file = widgetsSettingsPath(appLocation);
	if (!existsSync(file)) return [];

	try {
		const settings = JSON.parse(readFileSync(file, 'utf8')) as Partial<WidgetsSettings>;
		return Array.isArray(settings.widgets)
			? settings.widgets
					.filter(isWidgetConfiguration)
					.filter((widget) => existsSync(widgetPagePath(widget.id, appLocation)))
			: [];
	} catch {
		return [];
	}
}
