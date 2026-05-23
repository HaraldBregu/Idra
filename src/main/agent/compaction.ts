import { createHash } from 'node:crypto';
import { agentLogger } from './logger';
import { buildAgentHookContext } from './harness/hook-context';
import {
	fireAfterCompactionHook,
	fireBeforeCompactionHook,
} from './harness/prompt-compaction-hook-helpers';
import type { ProviderAdapter, TranscriptEntry } from '../provider/types';
import type { CompactionMarker } from '../session/store';
import type { ModelReasoningEffort } from '../../shared/agents/service';

const KEEP_RECENT = 6;

const compactionMutex = new Map<string, Promise<void>>();

export interface AgentCompactionOptions {
	runId?: string;
	agentId?: string;
	sessionKey?: string;
	providerId?: string;
	requestedRuntime?: string;
	storedRuntime?: string;
	channelId?: string;
}

type NativeCompactionResult = {
	transcript: TranscriptEntry[];
	marker: CompactionMarker | null;
};

/**
 * Replace older transcript turns with a one-paragraph summary. Used when
 * the provider rejects the request with a ContextOverflowError. The most
 * recent {@link KEEP_RECENT} turns are kept verbatim.
 *
 * Plugin harnesses that implement `compact()` can override this via
 * `maybeCompactAgentHarnessSession` from `harness/selection`. Wire that call
 * here once the harness compact API carries typed transcript params.
 */
export async function compact(
	sessionId: string,
	transcript: TranscriptEntry[],
	provider: ProviderAdapter,
	model: string,
	effort?: ModelReasoningEffort,
	options: AgentCompactionOptions = {}
): Promise<NativeCompactionResult> {
	if (compactionMutex.has(sessionId)) {
		await compactionMutex.get(sessionId);
		return { transcript, marker: null };
	}
	let release!: () => void;
	const p = new Promise<void>((r) => (release = r));
	compactionMutex.set(sessionId, p);
	try {
		if (transcript.length <= KEEP_RECENT + 2) {
			return { transcript, marker: null };
		}
		const hookContext = buildAgentHookContext({
			runId: options.runId ?? sessionId,
			agentId: options.agentId,
			sessionId,
			sessionKey: options.sessionKey,
			provider: options.providerId,
			modelId: model,
			channelId: options.channelId,
		});
		await fireBeforeCompactionHook({
			...hookContext,
			transcriptLength: transcript.length,
		});

		const harnessResult = await compactWithAgentHarness({
			sessionId,
			transcript,
			model,
			options,
		});
		if (harnessResult) {
			await fireAfterCompactionHook({
				...hookContext,
				transcriptLength: harnessResult.transcript.length,
				summaryHash: harnessResult.marker?.summaryHash,
			});
			return harnessResult;
		}

		const toDrop = transcript.slice(0, transcript.length - KEEP_RECENT);
		const keep = transcript.slice(transcript.length - KEEP_RECENT);

		const dropText = renderForSummary(toDrop);
		agentLogger.info('agent:compaction', 'compacting', { sessionId, turns: transcript.length, dropping: toDrop.length });
		const summary = await runSummarize(provider, model, dropText, effort);

		const synthetic: TranscriptEntry = {
			role: 'user',
			content: `<previous conversation summary>\n\n${summary}`,
		};
		const next: TranscriptEntry[] = [synthetic, ...keep];
		const hash = createHash('sha1').update(summary).digest('hex').slice(0, 12);
		agentLogger.info('agent:compaction', 'compaction complete', { sessionId, hash });
		const result = {
			transcript: next,
			marker: { atTurn: transcript.length, droppedCount: toDrop.length, summaryHash: hash },
		};
		await fireAfterCompactionHook({
			...hookContext,
			transcriptLength: result.transcript.length,
			summaryHash: result.marker.summaryHash,
		});
		return result;
	} finally {
		release();
		compactionMutex.delete(sessionId);
	}
}

async function compactWithAgentHarness(params: {
	sessionId: string;
	transcript: TranscriptEntry[];
	model: string;
	options: AgentCompactionOptions;
}): Promise<NativeCompactionResult | undefined> {
	const { options } = params;
	if (!options.requestedRuntime && !options.storedRuntime) {
		return undefined;
	}

	const { maybeCompactAgentHarnessSession } = await import('./harness/selection');
	const result = await maybeCompactAgentHarnessSession({
		sessionId: params.sessionId,
		sessionKey: options.sessionKey,
		provider: options.providerId,
		modelId: params.model,
		requestedRuntime: options.requestedRuntime,
		storedRuntime: options.storedRuntime,
		transcript: params.transcript,
	});

	if (isNativeCompactionResult(result)) {
		return result;
	}
	return undefined;
}

function isNativeCompactionResult(value: unknown): value is NativeCompactionResult {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Partial<NativeCompactionResult>;
	return Array.isArray(candidate.transcript) && 'marker' in candidate;
}

function renderForSummary(entries: TranscriptEntry[]): string {
	const out: string[] = [];
	for (const e of entries) {
		if (e.role === 'user') out.push(`USER: ${e.content}`);
		else if (e.role === 'assistant') {
			const text = e.content
				.map((b) => {
					if (b.type === 'text') return b.text;
					if (b.type === 'reasoning') return '';
					if (b.type === 'tool_use') {
						return `[tool ${b.toolName} ${JSON.stringify(b.toolArgs ?? {}).slice(0, 200)}]`;
					}
					return '';
				})
				.join('');
			out.push(`AGENT: ${text}`);
		} else if (e.role === 'tool') {
			const t = e.content
				.map((c) => (c.type === 'text' ? c.text : '[binary]'))
				.join('')
				.slice(0, 800);
			out.push(`TOOL_RESULT(${e.toolUseId}): ${t}`);
		}
	}
	return out.join('\n');
}

async function runSummarize(
	provider: ProviderAdapter,
	model: string,
	body: string,
	effort?: ModelReasoningEffort
): Promise<string> {
	const system =
		'Summarize the following conversation compactly. Preserve facts, decisions, file paths, and exact command outputs that matter. Output plain text only.';
	const userMsg: TranscriptEntry = { role: 'user', content: body };
	let collected = '';
	for await (const event of provider.stream({
		model,
		effort,
		system,
		messages: [userMsg],
		tools: [],
		maxTokens: 2048,
	})) {
		if (event.type === 'text_delta') collected += event.text;
	}
	return collected.trim();
}
