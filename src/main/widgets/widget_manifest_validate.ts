import type { WidgetManifest } from './widget_types';

export function isWidgetManifest(value: unknown): value is WidgetManifest {
	if (!value || typeof value !== 'object') return false;
	const manifest = value as Record<string, unknown>;
	return (
		typeof manifest.name === 'string' &&
		manifest.name.trim().length > 0 &&
		typeof manifest.description === 'string' &&
		Boolean(manifest.metadata) &&
		typeof manifest.metadata === 'object' &&
		!Array.isArray(manifest.metadata)
	);
}
