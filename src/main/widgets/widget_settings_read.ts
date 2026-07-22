import { existsSync, readFileSync } from 'node:fs';
import { widgetsSettingsPath } from './widget_settings';
import type { WidgetSettings } from './widget_types';

export function readWidgetSettings(appLocation?: string): WidgetSettings {
	const file = widgetsSettingsPath(appLocation);
	if (!existsSync(file)) return { enabled: true };
	try {
		const value = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
		return typeof value.enabled === 'boolean' ? { enabled: value.enabled } : { enabled: true };
	} catch {
		return { enabled: true };
	}
}
