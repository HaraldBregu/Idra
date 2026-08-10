import type { DirectoryPermissions } from './permissions_types';

export function normalizeDirectoryPermissions(value: unknown): DirectoryPermissions {
	if (!Array.isArray(value)) return [];
	const result: DirectoryPermissions = [];
	for (const candidate of value) {
		if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
		const entry = candidate as Record<string, unknown>;
		const directory = typeof entry.path === 'string' ? entry.path.trim() : '';
		if (!directory) continue;
		const enabled = typeof entry.enabled === 'boolean' ? entry.enabled : true;
		if (typeof entry.recoursive !== 'boolean') continue;
		let tools: '*' | string[];
		if (entry.tools === '*') {
			tools = '*';
		} else if (Array.isArray(entry.tools)) {
			tools = [
				...new Set(
					entry.tools
						.filter((tool): tool is string => typeof tool === 'string')
						.map((tool) => tool.trim())
						.filter(Boolean)
				),
			];
		} else continue;
		const existingIndex = result.findIndex((permission) => permission.path === directory);
		if (existingIndex >= 0) result.splice(existingIndex, 1);
		result.push({ path: directory, enabled, recoursive: entry.recoursive, tools });
	}
	return result;
}
