import type { ToolResultBlock } from '../../provider/types';
import type { AgentHarnessHookContext } from './hook-context';

const AGENT_TOOL_RESULT_MIDDLEWARE_STATE = Symbol.for('friday.agentToolResultMiddlewareState');
const MAX_BLOCKS = 200;
const MAX_TEXT_CHARS = 100_000;
const MAX_IMAGE_DATA_CHARS = 5_000_000;
const MAX_DETAILS_BYTES = 100_000;
const MAX_DETAILS_DEPTH = 20;
const MAX_DETAILS_KEYS = 1_000;

export type AgentToolResultMiddlewareFn = (
	blocks: ToolResultBlock[],
	ctx: AgentHarnessHookContext
) => Promise<ToolResultBlock[]> | ToolResultBlock[];

export type AgentToolResultMiddlewareRegistration = {
	name: string;
	runtime?: string;
	handler: AgentToolResultMiddlewareFn;
};

interface AgentToolResultMiddlewareState {
	registrations: AgentToolResultMiddlewareRegistration[];
}

const ERROR_RESULT: ToolResultBlock[] = [{ type: 'text', text: '[tool result middleware error]' }];

function getState(): AgentToolResultMiddlewareState {
	const globalState = globalThis as typeof globalThis & {
		[AGENT_TOOL_RESULT_MIDDLEWARE_STATE]?: AgentToolResultMiddlewareState;
	};
	globalState[AGENT_TOOL_RESULT_MIDDLEWARE_STATE] ??= {
		registrations: [],
	};
	return globalState[AGENT_TOOL_RESULT_MIDDLEWARE_STATE];
}

function normalizeMiddlewareRegistration(input: unknown): AgentToolResultMiddlewareRegistration {
	if (!input || typeof input !== 'object') {
		throw new Error('Agent tool result middleware registration must be an object.');
	}
	const candidate = input as Partial<AgentToolResultMiddlewareRegistration>;
	const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
	if (!name) throw new Error('Agent tool result middleware registration missing name.');
	if (typeof candidate.handler !== 'function') {
		throw new Error(`Agent tool result middleware "${name}" registration missing handler.`);
	}
	const runtime =
		typeof candidate.runtime === 'string' && candidate.runtime.trim()
			? candidate.runtime.trim().toLowerCase()
			: undefined;
	return { name, runtime, handler: candidate.handler };
}

export function registerAgentToolResultMiddleware(registration: unknown): void {
	getState().registrations.push(normalizeMiddlewareRegistration(registration));
}

export function listAgentToolResultMiddlewareRegistrations(): AgentToolResultMiddlewareRegistration[] {
	return [...getState().registrations];
}

export function clearAgentToolResultMiddlewareRegistrations(): void {
	getState().registrations = [];
}

function countObjectDepth(value: unknown, depth = 0): number {
	if (depth > MAX_DETAILS_DEPTH || typeof value !== 'object' || value === null) return depth;
	return Math.max(...Object.values(value as Record<string, unknown>).map((v) => countObjectDepth(v, depth + 1)));
}

function countObjectKeys(value: unknown): number {
	if (typeof value !== 'object' || value === null) return 0;
	let count = Object.keys(value as Record<string, unknown>).length;
	for (const v of Object.values(value as Record<string, unknown>)) {
		count += countObjectKeys(v);
	}
	return count;
}

function sanitizeDetails(details: unknown): unknown {
	try {
		return JSON.parse(JSON.stringify(details));
	} catch {
		return undefined;
	}
}

function validateBlock(block: ToolResultBlock): boolean {
	if (block.type === 'text') return block.text.length <= MAX_TEXT_CHARS;
	if (block.type === 'image') return (block.base64 ?? '').length <= MAX_IMAGE_DATA_CHARS;
	return true;
}

function validateBlocks(blocks: ToolResultBlock[]): boolean {
	if (blocks.length > MAX_BLOCKS) return false;
	return blocks.every(validateBlock);
}

function validateDetails(details: unknown): boolean {
	if (details === undefined || details === null) return true;
	try {
		const json = JSON.stringify(details);
		if (json.length > MAX_DETAILS_BYTES) return false;
		if (countObjectDepth(details) > MAX_DETAILS_DEPTH) return false;
		if (countObjectKeys(details) > MAX_DETAILS_KEYS) return false;
		return true;
	} catch {
		return false;
	}
}

export function sanitizeToolResultDetails<T extends { details?: unknown }>(entry: T): T {
	if (entry.details === undefined) return entry;
	const sanitized = sanitizeDetails(entry.details);
	return validateDetails(sanitized) ? { ...entry, details: sanitized } : { ...entry, details: undefined };
}

export async function runAgentToolResultMiddleware(
	blocks: ToolResultBlock[],
	registrations: AgentToolResultMiddlewareRegistration[],
	ctx: AgentHarnessHookContext,
	runtime?: string
): Promise<ToolResultBlock[]> {
	if (registrations.length === 0) return blocks;

	const applicable = runtime
		? registrations.filter((r) => !r.runtime || r.runtime === runtime)
		: registrations;

	if (applicable.length === 0) return blocks;

	let current = blocks;
	for (const reg of applicable) {
		try {
			const next = await reg.handler(current, ctx);
			if (!validateBlocks(next)) {
				return ERROR_RESULT;
			}
			current = next;
		} catch {
			return ERROR_RESULT;
		}
	}
	return current;
}
