import { existsSync, readFileSync } from 'node:fs';
import { widgetsSettingsPath } from './widget_settings';
import { isWidgetConfiguration } from './widget_validate';
import type { WidgetConfiguration, WidgetsSettings } from './widget_types';

export function listWidgets(appLocation?: string): WidgetConfiguration[] {
	const file = widgetsSettingsPath(appLocation);
	if (!existsSync(file)) return [];

	try {
		const settings = JSON.parse(readFileSync(file, 'utf8')) as Partial<WidgetsSettings>;
		return Array.isArray(settings.widgets) ? settings.widgets.filter(isWidgetConfiguration) : [];
	} catch {
		return [];
	}
}
