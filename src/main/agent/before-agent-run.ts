import type { TranscriptEntry } from '../provider/types';
import { agentLogger } from './logger';

export interface BeforeAgentRunEvent {
	prompt: string;
	messages: TranscriptEntry[];
	systemPrompt: string;
	channelId?: string;
	accountId?: string;
	senderId?: string;
	senderIsOwner?: boolean;
}

export type BeforeAgentRunDecision =
	| { outcome: 'pass' }
	| {
			outcome: 'block';
			reason: string;
			message?: string;
			category?: string;
			metadata?: Record<string, unknown>;
	  };

export type BeforeAgentRunHook = (
	event: BeforeAgentRunEvent
) => BeforeAgentRunDecision | void | Promise<BeforeAgentRunDecision | void>;

export type BeforeAgentRunResult =
	| { outcome: 'pass' }
	| {
			outcome: 'block';
			message: string;
			metadata: {
				blockedBy: 'before_agent_run';
				blockedAt: string;
				category?: string;
				metadata?: Record<string, unknown>;
			};
	  };

const DEFAULT_BLOCK_MESSAGE = 'This request was blocked by the configured safety policy.';
const DEFAULT_HOOK_TIMEOUT_MS = 5_000;

export async function evaluateBeforeAgentRunHooks(
	hooks: readonly BeforeAgentRunHook[] | undefined,
	event: BeforeAgentRunEvent,
	timeoutMs = DEFAULT_HOOK_TIMEOUT_MS
): Promise<BeforeAgentRunResult> {
	for (const hook of hooks ?? []) {
		const decision = await runHook(hook, event, timeoutMs);
		if (!decision || decision.outcome === 'pass') continue;
		return toBlockedResult(decision);
	}
	return { outcome: 'pass' };
}

async function runHook(
	hook: BeforeAgentRunHook,
	event: BeforeAgentRunEvent,
	timeoutMs: number
): Promise<BeforeAgentRunDecision | void> {
	try {
		const timeout = new Promise<BeforeAgentRunDecision>((resolve) => {
			const timer = setTimeout(() => {
				resolve({
					outcome: 'block',
					reason: 'before_agent_run_timeout',
					message: DEFAULT_BLOCK_MESSAGE,
					category: 'hook_timeout',
				});
			}, timeoutMs);
			timer.unref?.();
		});
		const decision = await Promise.race([Promise.resolve(hook(event)), timeout]);
		if (decision === undefined) return undefined;
		if (isValidDecision(decision)) return decision;
		return {
			outcome: 'block',
			reason: 'before_agent_run_invalid_decision',
			message: DEFAULT_BLOCK_MESSAGE,
			category: 'hook_invalid',
		};
	} catch (hookErr) {
		agentLogger.error('agent:before-run', 'hook threw', { error: hookErr instanceof Error ? hookErr.message : String(hookErr) });
		return {
			outcome: 'block',
			reason: 'before_agent_run_hook_error',
			message: DEFAULT_BLOCK_MESSAGE,
			category: 'hook_error',
		};
	}
}

function isValidDecision(value: unknown): value is BeforeAgentRunDecision {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Partial<BeforeAgentRunDecision>;
	if (candidate.outcome === 'pass') return true;
	if (candidate.outcome !== 'block') return false;
	return typeof candidate.reason === 'string' && candidate.reason.trim().length > 0;
}

function toBlockedResult(decision: Extract<BeforeAgentRunDecision, { outcome: 'block' }>): BeforeAgentRunResult {
	return {
		outcome: 'block',
		message: safeMessage(decision.message),
		metadata: {
			blockedBy: 'before_agent_run',
			blockedAt: new Date().toISOString(),
			category: decision.category,
			metadata: safeMetadata(decision.metadata),
		},
	};
}

function safeMessage(message: string | undefined): string {
	const trimmed = message?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_BLOCK_MESSAGE;
}

function safeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
	if (!metadata) return undefined;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (/prompt|reason|secret|token|password|credential/i.test(key)) continue;
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			out[key] = value;
		}
	}
	return Object.keys(out).length > 0 ? out : undefined;
}
