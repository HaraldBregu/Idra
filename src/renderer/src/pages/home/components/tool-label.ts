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

type ToolVerbs = { readonly running: string; readonly done: string };

export function toolVerbs(type: string): ToolVerbs {
	const t = type.toLowerCase();
	if (t === 'edit' || t === 'write' || t === 'apply_patch') {
		return { running: 'Editing', done: 'Edited' };
	}
	if (t === 'browser' || t.startsWith('web_') || t.startsWith('mcp__')) {
		return { running: 'Browsing', done: 'Browsed' };
	}
	if (t.includes('schedule')) return { running: 'Task', done: 'Task' };
	if (t === 'create_image') return { running: 'Creating image', done: 'Created image' };
	if (t === 'subagent') return { running: 'Subagent', done: 'Subagent' };
	if (t.includes('skill')) return { running: 'Skill', done: 'Skill' };
	return { running: 'Exploring', done: 'Explored' };
}

export function toolGroupLabel(type: string, tools: readonly AgentToolPart[]): string {
	const verbs = toolVerbs(type);
	return tools.some(isToolRunning) ? verbs.running : verbs.done;
}

export function isToolRunning(tool: AgentToolPart): boolean {
	return tool.state === 'input-streaming' || tool.state === 'input-available';
}

const fileVerbs = new Set(['Exploring', 'Explored', 'Editing', 'Edited']);

export function toolActivitySummary(tools: readonly AgentToolPart[]): {
	readonly verb: string;
	readonly detail: string;
} {
	const running = tools.some(isToolRunning);
	const key = running ? 'running' : 'done';
	const labels = new Set(tools.map((tool) => toolVerbs(tool.type)[key]));
	const verb =
		labels.size === 1 ? (labels.values().next().value as string) : running ? 'Working' : 'Finished';
	const count = tools.length;
	const detail = fileVerbs.has(verb) ? `${count} ${count === 1 ? 'file' : 'files'}` : `${count}`;
	return { verb, detail };
}
