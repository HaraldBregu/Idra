import type { AgentInputFile } from './agent_types';

export function normalizeAgentInputFiles(value: unknown): AgentInputFile[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const files: AgentInputFile[] = [];
	for (const item of value) {
		if (!item || typeof item !== 'object') continue;
		const { name, mimeType, data } = item as Record<string, unknown>;
		if (typeof name !== 'string' || typeof mimeType !== 'string' || typeof data !== 'string')
			continue;
		if (!mimeType.trim() || !data) continue;
		files.push({ name, mimeType: mimeType.trim(), data });
	}
	return files.length > 0 ? files : undefined;
}
