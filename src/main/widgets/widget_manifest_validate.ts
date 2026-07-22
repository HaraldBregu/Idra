import { isWidgetEntry } from './widget_entry_validate';
import type { WidgetManifest } from './widget_types';

export function isWidgetManifest(value: unknown): value is WidgetManifest {
	if (!value || typeof value !== 'object') return false;
	const manifest = value as Record<string, unknown>;
	const metadata = manifest.metadata as Record<string, unknown> | undefined;
	return (
		typeof manifest.title === 'string' &&
		manifest.title.trim().length > 0 &&
		typeof manifest.description === 'string' &&
		manifest.description.trim().length > 0 &&
		Boolean(metadata) &&
		typeof metadata === 'object' &&
		!Array.isArray(metadata) &&
		typeof metadata.version === 'string' &&
		metadata.version.trim().length > 0 &&
		typeof metadata.category === 'string' &&
		metadata.category.trim().length > 0 &&
		isWidgetEntry(metadata.entry)
	);
}
