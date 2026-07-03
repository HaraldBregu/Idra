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

export function toolPartLabel(tool: AgentToolPart): string {
	if (tool.displayName) return tool.displayName;

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

	if (type === 'search_skills') {
		const query = stringArg(input, 'query');
		return query ? `Searched skills for "${query}"` : 'Searched skills';
	}

	if (type === 'select_skill') {
		const name = stringArg(input, 'name');
		return name ? `Selected skill "${name}"` : 'Cleared skill selection';
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

export function toolActivitySummary(tools: readonly AgentToolPart[]): {
	readonly verb: string;
	readonly detail: string;
} {
	const count = tools.length;
	const verb = tools.some(isToolRunning) ? 'Exploring' : 'Explored';
	const noun = count === 1 ? 'file' : 'files';
	return { verb, detail: `${count} ${noun}` };
}
