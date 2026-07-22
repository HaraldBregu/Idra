import { mkdirSync, writeFileSync } from 'node:fs';
import { widgetsRoot } from './widget_root';
import { widgetsSettingsPath } from './widget_settings';
import type { WidgetSettings } from './widget_types';

export function storeWidgetSettings(settings: WidgetSettings, appLocation?: string): void {
	mkdirSync(widgetsRoot(appLocation), { recursive: true });
	writeFileSync(
		widgetsSettingsPath(appLocation),
		`${JSON.stringify({ enabled: settings.enabled }, null, '\t')}\n`,
		'utf8'
	);
}
