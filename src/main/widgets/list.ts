import { existsSync, readFileSync } from 'node:fs';
import { widgetsSettingsPath } from './settings';
import { isWidgetConfiguration } from './validate';
import type { WidgetConfiguration, WidgetsSettings } from './types';

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
