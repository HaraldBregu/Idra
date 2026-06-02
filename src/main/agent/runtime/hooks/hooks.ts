import type { ToolResultBlock } from '../../../llm/llmTypes';

export type RuntimeHookContext = {
	runId?: string;
	agentId?: string;
	sessionId?: string;
	sessionKey?: string;
	provider?: string;
	modelId?: string;
	channelId?: string;
	[key: string]: unknown;
};

export type RuntimeHookHandler = (payload: Record<string, unknown>) => void | Promise<void>;

const hookHandlers = new Map<string, Set<RuntimeHookHandler>>();

export function buildAgentHookContext(params: RuntimeHookContext): RuntimeHookContext {
	return params;
}

export function registerRuntimeHook(name: string, handler: RuntimeHookHandler): () => void {
	const handlers = hookHandlers.get(name) ?? new Set<RuntimeHookHandler>();
	handlers.add(handler);
	hookHandlers.set(name, handlers);
	return () => {
		handlers.delete(handler);
		if (handlers.size === 0) hookHandlers.delete(name);
	};
}

export function clearRuntimeHooks(): void {
	hookHandlers.clear();
}

export async function emitRuntimeLifecycleHook(
	name: string,
	payload: Record<string, unknown>
): Promise<void> {
	for (const handler of hookHandlers.get(name) ?? []) {
		await handler(payload);
	}
}

export async function fireBeforeCompactionHook(payload: Record<string, unknown>): Promise<void> {
	await emitRuntimeLifecycleHook('before_compaction', payload);
}

export async function fireAfterCompactionHook(payload: Record<string, unknown>): Promise<void> {
	await emitRuntimeLifecycleHook('after_compaction', payload);
}

export type ToolResultMiddleware = (
	blocks: ToolResultBlock[],
	context: Record<string, unknown>
) => ToolResultBlock[] | Promise<ToolResultBlock[]>;

const toolResultMiddleware = new Set<ToolResultMiddleware>();

export function registerToolResultMiddleware(middleware: ToolResultMiddleware): () => void {
	toolResultMiddleware.add(middleware);
	return () => toolResultMiddleware.delete(middleware);
}

export function clearToolResultMiddleware(): void {
	toolResultMiddleware.clear();
}

export async function applyAgentToolResultMiddleware(
	blocks: ToolResultBlock[],
	context: Record<string, unknown>
): Promise<ToolResultBlock[]> {
	let next = blocks;
	for (const middleware of toolResultMiddleware) {
		const candidate = await middleware(next, context);
		next = candidate.every(isToolResultBlock) ? candidate : next;
	}
	return next;
}

function isToolResultBlock(block: ToolResultBlock): boolean {
	return block.type === 'text' || block.type === 'image';
}
