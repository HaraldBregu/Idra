import { createHash } from 'node:crypto';
import type { ProviderAdapter, TranscriptEntry } from '../provider/types';
import type { CompactionMarker } from '../session/store';

const KEEP_RECENT = 6;

const compactionMutex = new Map<string, Promise<void>>();

/**
 * Replace older transcript turns with a one-paragraph summary. Used when
 * the provider rejects the request with a ContextOverflowError. The most
 * recent {@link KEEP_RECENT} turns are kept verbatim.
 */
export async function compact(
	sessionId: string,
	transcript: TranscriptEntry[],
	provider: ProviderAdapter,
	model: string
): Promise<{ transcript: TranscriptEntry[]; marker: CompactionMarker | null }> {
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
		const summary = await runSummarize(provider, model, dropText);

		const synthetic: TranscriptEntry = {
			role: 'user',
			content: `<previous conversation summary>\n\n${summary}`,
		};
		const next: TranscriptEntry[] = [synthetic, ...keep];
		const hash = createHash('sha1').update(summary).digest('hex').slice(0, 12);
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
					if (b.type === 'tool_use') {
						return `[tool ${b.toolName} ${JSON.stringify(b.toolArgs ?? {}).slice(0, 200)}]`;
					}
					return '';
				})
				.join('');
			out.push(`ASSISTANT: ${text}`);
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
	body: string
): Promise<string> {
	const system =
		'Summarize the following conversation compactly. Preserve facts, decisions, file paths, and exact command outputs that matter. Output plain text only.';
	const userMsg: TranscriptEntry = { role: 'user', content: body };
	let collected = '';
	for await (const event of provider.stream({
		model,
		system,
		messages: [userMsg],
		tools: [],
		maxTokens: 2048,
	})) {
		if (event.type === 'text_delta') collected += event.text;
	}
	return collected.trim();
}
