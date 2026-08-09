import type { DirectoryPermissions } from './permissions_types';

export function normalizeDirectoryPermissions(value: unknown): DirectoryPermissions {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const result: DirectoryPermissions = {};
	for (const [rawPath, candidate] of Object.entries(value)) {
		const directory = rawPath.trim();
		if (!directory || !candidate || typeof candidate !== 'object' || Array.isArray(candidate))
			continue;
		const entry = candidate as Record<string, unknown>;
		if (typeof entry.recoursive !== 'boolean') continue;
		if (entry.tools === '*') {
			result[directory] = { recoursive: entry.recoursive, tools: '*' };
			continue;
		}
		if (!Array.isArray(entry.tools)) continue;
		result[directory] = {
			recoursive: entry.recoursive,
			tools: [
				...new Set(
					entry.tools
						.filter((tool): tool is string => typeof tool === 'string')
						.map((tool) => tool.trim())
						.filter(Boolean)
				),
			],
		};
	}
	return result;
}
