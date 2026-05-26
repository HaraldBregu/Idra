import type { ToolResultBlock } from '../../provider/types';
import type {
	AgentHarness,
	AgentHarnessAttemptParams,
	AgentHarnessAttemptResult,
	AgentHarnessCompactParams,
	AgentHarnessSupportDecision,
} from './types';

export type AgentHarnessLifecycleHookName =
	| 'before_agent_start'
	| 'before_message_write'
	| 'llm_input'
	| 'llm_output'
	| 'after_tool_call'
	| 'agent_end';

export type AgentHarnessLifecycleHookHandler = (payload: Record<string, unknown>) => void | Promise<void>;

export interface AgentToolResultMiddlewareRegistration {
	name: string;
	runtime?: string;
	handler(input: ToolResultBlock[], context: AgentToolResultMiddlewareContext): ToolResultBlock[] | Promise<ToolResultBlock[]>;
}

export interface AgentToolResultMiddlewareContext {
	runtime?: string;
	runId: string;
	iteration: number;
	toolName: string;
	toolUseId: string;
	args: unknown;
	isError: boolean;
}

const harnesses = new Map<string, AgentHarness>();
const hookHandlers = new Map<AgentHarnessLifecycleHookName, Set<AgentHarnessLifecycleHookHandler>>();
const toolResultMiddleware: AgentToolResultMiddlewareRegistration[] = [];

export function registerAgentHarness(harness: AgentHarness): () => void {
	harnesses.set(harness.id, harness);
	return () => {
		if (harnesses.get(harness.id) === harness) harnesses.delete(harness.id);
	};
}

export function clearRegisteredAgentHarnesses(): void {
	harnesses.clear();
}

export function selectAgentHarness(input: {
	provider: string;
	modelId: string;
	requestedRuntime?: string;
}): AgentHarness {
	if (input.requestedRuntime) {
		const forced = harnesses.get(input.requestedRuntime);
		if (!forced) throw new Error(`Requested agent harness "${input.requestedRuntime}" is not registered.`);
		const decision = supportDecision(forced, input);
		if (!decision.supported) {
			throw new Error(decision.reason ?? `Requested agent harness "${input.requestedRuntime}" does not support this model.`);
		}
		return forced;
	}

	const supported = [...harnesses.values()]
		.map((harness) => ({ harness, decision: supportDecision(harness, input) }))
		.filter((entry) => entry.decision.supported)
		.sort((a, b) => {
			const priority = (b.decision.priority ?? 0) - (a.decision.priority ?? 0);
			return priority || a.harness.id.localeCompare(b.harness.id);
		});
	if (supported.length === 0) throw new Error('No registered agent harness supports this model.');
	return supported[0].harness;
}

export async function resetRegisteredAgentHarnesses(input: { reason: string }): Promise<void> {
	await Promise.all(
		[...harnesses.values()].map(async (harness) => {
			try {
				await harness.reset?.(input);
			} catch {
				return undefined;
			}
		})
	);
}

export function adaptAgentHarnessToV2(harness: AgentHarness): AgentHarness {
	return harness;
}

export async function runAgentHarnessV2LifecycleAttempt(
	harness: AgentHarness,
	params: AgentHarnessAttemptParams
): Promise<AgentHarnessAttemptResult> {
	await emitAgentHarnessLifecycleHook('before_agent_start', {
		runId: params.runId,
		userMessage: params.userMessage,
		provider: params.provider,
		modelId: params.model,
	});
	const base = harness.runAttempt
		? await harness.runAttempt(params)
		: await runExecutableHarnessAttempt(harness, params);
	const classification = harness.classify?.(base, params);
	return {
		...base,
		agentHarnessId: harness.id,
		...(classification ? { agentHarnessResultClassification: classification } : {}),
	};
}

export async function maybeCompactAgentHarnessSession(params: AgentHarnessCompactParams): Promise<unknown> {
	if (!params.requestedRuntime) return undefined;
	const harness = selectAgentHarness({
		provider: params.provider,
		modelId: params.modelId,
		requestedRuntime: params.requestedRuntime,
	});
	return harness.compact?.(params);
}

export function collectConfiguredAgentHarnessRuntimes(config: unknown, env: Record<string, string | undefined> = process.env): string[] {
	const values = [
		readRuntime(readPath(config, ['assistant', 'options'])),
		...readArray(readPath(config, ['agents'])).map((agent) => readRuntime(readPath(agent, ['options']))),
		env.FRIDAY_AGENT_RUNTIME,
	];
	const seen = new Set<string>();
	return values.flatMap((value) => {
		const trimmed = value?.trim();
		if (!trimmed || seen.has(trimmed)) return [];
		seen.add(trimmed);
		return [trimmed];
	});
}

export function registerAgentHarnessHookHandler(
	name: AgentHarnessLifecycleHookName,
	handler: AgentHarnessLifecycleHookHandler
): () => void {
	const handlers = hookHandlers.get(name) ?? new Set();
	handlers.add(handler);
	hookHandlers.set(name, handlers);
	return () => {
		handlers.delete(handler);
		if (handlers.size === 0) hookHandlers.delete(name);
	};
}

export function clearAgentHarnessHookProviders(): void {
	hookHandlers.clear();
}

export async function emitAgentHarnessLifecycleHook(
	name: AgentHarnessLifecycleHookName,
	payload: Record<string, unknown>
): Promise<void> {
	for (const handler of hookHandlers.get(name) ?? []) {
		await handler(payload);
	}
}

export function registerAgentToolResultMiddleware(
	registration: AgentToolResultMiddlewareRegistration
): () => void {
	toolResultMiddleware.push(registration);
	return () => {
		const index = toolResultMiddleware.indexOf(registration);
		if (index >= 0) toolResultMiddleware.splice(index, 1);
	};
}

export function clearAgentToolResultMiddlewareRegistrations(): void {
	toolResultMiddleware.splice(0);
}

export async function applyAgentToolResultMiddleware(
	content: ToolResultBlock[],
	context: AgentToolResultMiddlewareContext
): Promise<ToolResultBlock[]> {
	let next = content;
	for (const middleware of toolResultMiddleware) {
		if (middleware.runtime && middleware.runtime !== context.runtime) continue;
		next = await middleware.handler(next, context);
	}
	return next;
}

function supportDecision(
	harness: AgentHarness,
	input: { provider: string; modelId: string }
): AgentHarnessSupportDecision {
	return harness.supports?.(input) ?? { supported: true };
}

async function runExecutableHarnessAttempt(
	harness: AgentHarness,
	params: AgentHarnessAttemptParams
): Promise<AgentHarnessAttemptResult> {
	if (!harness.execute) throw new Error(`Agent harness "${harness.id}" does not implement runAttempt.`);
	const result = await harness.execute({
		runId: params.runId,
		sessionId: params.session.id,
		task: params.userMessage,
		signal: params.signal,
	});
	return {
		finalText: result.finalText,
		toolCalls: result.toolCalls,
		usage: result.usage,
		stopReason: result.stopReason,
		session: params.session,
	};
}

function readRuntime(value: unknown): string | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const runtime = (value as { agentRuntime?: unknown; agentHarnessId?: unknown }).agentRuntime ??
		(value as { agentHarnessId?: unknown }).agentHarnessId;
	return typeof runtime === 'string' ? runtime : undefined;
}

function readArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function readPath(value: unknown, path: string[]): unknown {
	let current = value;
	for (const part of path) {
		if (!current || typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}
