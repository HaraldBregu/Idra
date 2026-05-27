import { createHash } from 'node:crypto';
import { agentLogger } from './logger';
import type { ProviderAdapter, TranscriptEntry } from '../provider/types';
import type { CompactionMarker } from './session/store';
import type { ModelReasoningEffort } from '../../shared/agents/service';

const KEEP_RECENT = 6;

const compactionMutex = new Map<string, Promise<void>>();

export interface AgentCompactionOptions {
	runId?: string;
	agentId?: string;
	sessionKey?: string;
	providerId?: string;
	channelId?: string;
}

type NativeCompactionResult = {
	transcript: TranscriptEntry[];
	marker: CompactionMarker | null;
};

export async function compact(
	sessionId: string,
	transcript: TranscriptEntry[],
	provider: ProviderAdapter,
	model: string,
	effort?: ModelReasoningEffort,
	_options: AgentCompactionOptions = {}
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
		return {
			transcript: next,
			marker: { atTurn: transcript.length, droppedCount: toDrop.length, summaryHash: hash },
		};
	} finally {
		release();
		compactionMutex.delete(sessionId);
	}
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
					return `[tool ${b.toolName}] ${JSON.stringify(b.toolArgs)}`;
				})
				.join('\n');
			out.push(`ASSISTANT: ${text}`);
		} else {
			out.push(`TOOL(${e.toolUseId}): ${e.content.map((c) => (c.type === 'text' ? c.text : '[binary]')).join('\n')}`);
		}
	}
	return out.join('\n\n').slice(0, 120_000);
}

async function runSummarize(
	provider: ProviderAdapter,
	model: string,
	text: string,
	effort?: ModelReasoningEffort
): Promise<string> {
	let summary = '';
	for await (const ev of provider.stream({
		model,
		effort,
		system:
			'Summarize the prior conversation for continuity. Keep durable facts, user preferences, decisions, open tasks, tool results, and important file paths. Be concise.',
		messages: [{ role: 'user', content: text }],
		tools: [],
		maxTokens: 1200,
	})) {
		if (ev.type === 'text_delta') summary += ev.text;
	}
	return summary.trim() || 'Conversation summary unavailable.';
}
