import type { MermaidConfig } from 'mermaid';

export function parseConfig(configText: string): MermaidConfig {
	const value = JSON.parse(configText) as unknown;
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('Mermaid configuration must be a JSON object.');
	}
	return value as MermaidConfig;
}
