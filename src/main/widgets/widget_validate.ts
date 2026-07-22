import { isWidgetId } from './widget_id';
import type { WidgetConfiguration } from './widget_types';

export function isWidgetConfiguration(value: unknown): value is WidgetConfiguration {
	if (!value || typeof value !== 'object') return false;
	const widget = value as Record<string, unknown>;
	return isWidgetId(widget.id);
}
