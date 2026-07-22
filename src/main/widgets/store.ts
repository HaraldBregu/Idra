import { mkdirSync, writeFileSync } from 'node:fs';
import { isWidgetConfiguration } from './validate';
import { widgetsRoot } from './root';
import { widgetsSettingsPath } from './settings';
import type { WidgetConfiguration, WidgetsSettings } from './types';

export function storeWidgets(widgets: readonly WidgetConfiguration[], appLocation?: string): void {
	const settings: WidgetsSettings = { widgets: widgets.filter(isWidgetConfiguration) };
	mkdirSync(widgetsRoot(appLocation), { recursive: true });
	writeFileSync(
		widgetsSettingsPath(appLocation),
		`${JSON.stringify(settings, null, '\t')}\n`,
		'utf8'
	);
}
