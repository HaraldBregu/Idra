import type { PluginSummary } from '../../shared/plugin_types';
import type { InstalledPlugin } from './repository';

export function pluginSummary(plugin: InstalledPlugin): PluginSummary {
	const { id, name, version, description, contributes } = plugin.manifest;
	return {
		id,
		name,
		version,
		description,
		contributions: Object.values(contributes).reduce((total, items) => total + items.length, 0),
	};
}
