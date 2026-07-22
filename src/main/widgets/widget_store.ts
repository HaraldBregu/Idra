import { mkdirSync, writeFileSync } from 'node:fs';
import { isWidgetConfiguration } from './widget_validate';
import { widgetsRoot } from './widget_root';
import { widgetsSettingsPath } from './widget_settings';
import type { WidgetConfiguration, WidgetsSettings } from './widget_types';

export function storeWidgets(widgets: readonly WidgetConfiguration[], appLocation?: string): void {
	const settings: WidgetsSettings = {
		widgets: widgets.filter(isWidgetConfiguration).map(({ id }) => ({ id })),
	};
	mkdirSync(widgetsRoot(appLocation), { recursive: true });
	writeFileSync(
		widgetsSettingsPath(appLocation),
		`${JSON.stringify(settings, null, '\t')}\n`,
		'utf8'
	);
}
