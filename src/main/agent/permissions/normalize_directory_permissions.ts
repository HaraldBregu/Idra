import type { DirectoryPermissions } from './permissions_types';

export function normalizeDirectoryPermissions(value: unknown): DirectoryPermissions {
	if (!value || typeof value !== 'object') return [];
	const candidates = Array.isArray(value)
		? value
		: Object.entries(value).map(([path, permission]) => ({
				...(permission && typeof permission === 'object' && !Array.isArray(permission)
					? permission
					: {}),
				path,
			}));
	const result: DirectoryPermissions = [];
	for (const candidate of candidates) {
		if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
		const entry = candidate as Record<string, unknown>;
		const directory = typeof entry.path === 'string' ? entry.path.trim() : '';
		if (!directory || !candidate || typeof candidate !== 'object' || Array.isArray(candidate))
			continue;
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
		result.push({ path: directory, recoursive: entry.recoursive, tools });
	}
	return result;
}
