import type { AgentToolPart } from '../context';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function basename(path: string): string {
	const normalized = path.replace(/\\/g, '/');
	const parts = normalized.split('/');
	return parts[parts.length - 1] || path;
}

function stringArg(input: Record<string, unknown>, ...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = input[key];
		if (typeof value === 'string' && value.length > 0) return value;
	}
	return undefined;
}

function capitalizeType(type: string): string {
	const normalized = type.replace(/_/g, ' ');
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function mcpParts(type: string): { server: string; tool: string } | undefined {
	if (!type.toLowerCase().startsWith('mcp__')) return undefined;
	const segments = type.split('__');
	if (segments.length < 3) return undefined;
	return { server: segments[1], tool: segments.slice(2).join('__') };
}

export function toolPartLabel(tool: AgentToolPart): string {
	if (tool.displayName) return tool.displayName;

	const mcp = mcpParts(tool.type);
	if (mcp) return `${mcp.server} · ${mcp.tool}`;

	const input = isRecord(tool.input) ? tool.input : {};
	const type = tool.type.toLowerCase();

	if (type === 'read') {
		const path = stringArg(input, 'path', 'file_path', 'filepath');
		if (path) return `Read ${basename(path)}`;
	}

	if (type === 'grep' || type === 'search') {
		const pattern = stringArg(input, 'pattern', 'query');
		if (pattern) return `Searched codebase for "${pattern}"`;
		return 'Searched codebase';
	}

	if (type === 'load_skill') {
		const name = stringArg(input, 'name');
		return name ? `Loaded skill "${name}"` : 'Loaded skill';
	}

	if (type === 'list_dir') {
		const path = stringArg(input, 'path');
		if (path) return `Listed ${basename(path)}`;
	}

	return capitalizeType(tool.type);
}

export function isToolRunning(tool: AgentToolPart): boolean {
	return tool.state === 'input-streaming' || tool.state === 'input-available';
}
