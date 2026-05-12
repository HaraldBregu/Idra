/**
 * Plugin manifest as it appears on disk in `<userData>/plugins/<id>/plugin.json`.
 * Authored by 3rd-party plugin developers.
 */
export interface PluginManifest {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly entry: string;
	readonly description?: string;
	readonly icon?: string;
	readonly permissions?: readonly string[];
}

/**
 * Plugin record surfaced to the host renderer (e.g. the Plugins settings page).
 * `rootPath` is included so the UI can show install location / open in finder.
 */
export interface PluginInfo {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly description?: string;
	readonly icon?: string;
	readonly rootPath: string;
	readonly entry: string;
	readonly running: boolean;
}

export function isPluginManifest(value: unknown): value is PluginManifest {
	if (typeof value !== 'object' || value === null) return false;
	const m = value as Partial<PluginManifest>;
	return (
		typeof m.id === 'string' &&
		m.id.length > 0 &&
		typeof m.name === 'string' &&
		typeof m.version === 'string' &&
		typeof m.entry === 'string' &&
		m.entry.length > 0
	);
}
