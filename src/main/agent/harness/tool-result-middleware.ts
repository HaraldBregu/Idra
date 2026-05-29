import type { ToolResultBlock } from '../../provider/types';

const MAX_BLOCKS = 200;
const MAX_TEXT_CHARS = 100_000;
const MAX_IMAGE_DATA_CHARS = 5_000_000;

export interface AgentToolResultMiddlewareContext {
	runtime?: string;
	runId: string;
	iteration: number;
	toolName: string;
	toolUseId: string;
	args: unknown;
	isError: boolean;
}

export interface AgentToolResultMiddlewareRegistration {
	name: string;
	runtime?: string;
	handler(input: ToolResultBlock[], context: AgentToolResultMiddlewareContext): ToolResultBlock[] | Promise<ToolResultBlock[]>;
}

const ERROR_RESULT: ToolResultBlock[] = [{ type: 'text', text: '[tool result middleware error]' }];

function validateBlock(block: ToolResultBlock): boolean {
	if (block.type === 'text') return block.text.length <= MAX_TEXT_CHARS;
	if (block.type === 'image') return (block.base64 ?? '').length <= MAX_IMAGE_DATA_CHARS;
	return true;
}

function validateBlocks(blocks: ToolResultBlock[]): boolean {
	return blocks.length <= MAX_BLOCKS && blocks.every(validateBlock);
}

const TOOL_RESULT_MIDDLEWARE_STATE = Symbol.for('friday.agentToolResultMiddlewareState');

interface MiddlewareState {
	registrations: AgentToolResultMiddlewareRegistration[];
}

function getMiddlewareState(): MiddlewareState {
	const g = globalThis as typeof globalThis & { [TOOL_RESULT_MIDDLEWARE_STATE]?: MiddlewareState };
	g[TOOL_RESULT_MIDDLEWARE_STATE] ??= { registrations: [] };
	return g[TOOL_RESULT_MIDDLEWARE_STATE];
}

export function registerAgentToolResultMiddleware(
	registration: AgentToolResultMiddlewareRegistration
): () => void {
	const { registrations } = getMiddlewareState();
	registrations.push(registration);
	return () => {
		const index = registrations.indexOf(registration);
		if (index >= 0) registrations.splice(index, 1);
	};
}

export function clearAgentToolResultMiddlewareRegistrations(): void {
	getMiddlewareState().registrations.splice(0);
}

export async function applyAgentToolResultMiddleware(
	content: ToolResultBlock[],
	context: AgentToolResultMiddlewareContext
): Promise<ToolResultBlock[]> {
	const { registrations } = getMiddlewareState();
	if (registrations.length === 0) return content;

	let next = content;
	for (const middleware of registrations) {
		if (middleware.runtime && middleware.runtime !== context.runtime) continue;
		try {
			const result = await middleware.handler(next, context);
			if (!validateBlocks(result)) return ERROR_RESULT;
			next = result;
		} catch {
			return ERROR_RESULT;
		}
	}
	return next;
}
