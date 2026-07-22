import { isWidgetId } from './id';
import type { WidgetConfiguration } from './types';

export function isWidgetConfiguration(value: unknown): value is WidgetConfiguration {
	if (!value || typeof value !== 'object') return false;
	const widget = value as Record<string, unknown>;
	return isWidgetId(widget.id) && typeof widget.name === 'string' && widget.name.trim().length > 0;
}
