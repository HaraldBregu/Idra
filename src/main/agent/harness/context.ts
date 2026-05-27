import type { TranscriptEntry } from '../../provider/types';
import type {
	AgentHarnessContextBuildResult,
	AgentHarnessContextManager,
	AgentHarnessMemoryRecord,
	AgentHarnessSession,
} from './types';
import { estimateTokenCount } from './model';

export interface BudgetedContextManagerOptions {
	maxHistoryMessages?: number;
	maxMemoryRecords?: number;
	defaultBudgetTokens?: number;
}

export class BudgetedAgentHarnessContextManager implements AgentHarnessContextManager {
	constructor(private readonly options: BudgetedContextManagerOptions = {}) {}

	async build(input: {
		task: string;
		session: AgentHarnessSession;
		memory: AgentHarnessMemoryRecord[];
		context: Record<string, unknown>;
		budgetTokens?: number;
	}): Promise<AgentHarnessContextBuildResult> {
		const budgetTokens = input.budgetTokens ?? this.options.defaultBudgetTokens ?? 12_000;
		const included: string[] = [];
		const dropped: string[] = [];
		const summarized: string[] = [];
		const messages: TranscriptEntry[] = [];
		let estimatedTokens = estimateTokenCount(input.task);

		const maxMemoryRecords = this.options.maxMemoryRecords ?? 8;
		const memory = input.memory.slice(0, maxMemoryRecords);
		if (memory.length) included.push(`memory:${memory.length}`);
		if (input.memory.length > memory.length) dropped.push(`memory:${input.memory.length - memory.length}`);

		const maxHistoryMessages = this.options.maxHistoryMessages ?? 20;
		const history = input.session.transcript.slice(-maxHistoryMessages);
		if (input.session.transcript.length > history.length) {
			summarized.push(`history:${input.session.transcript.length - history.length}`);
			const summary = summarizeTranscript(input.session.transcript.slice(0, -history.length));
			if (summary) {
				messages.push({ role: 'user', content: `Prior session summary:\n${summary}` });
				estimatedTokens += estimateTokenCount(summary);
			}
		}
		included.push(`history:${history.length}`);
		for (const entry of history) {
			const entryTokens = estimateTokenCount(JSON.stringify(entry));
			if (estimatedTokens + entryTokens > budgetTokens) {
				dropped.push(`message:${entry.role}`);
				continue;
			}
			messages.push(entry);
			estimatedTokens += entryTokens;
		}

		return {
			messages,
			systemPromptAdditions: [],
			metadata: {},
			trace: {
				budgetTokens,
				estimatedTokens,
				included,
				dropped,
				summarized,
			},
		};
	}
}

export function compactTranscriptToBudget(
	transcript: TranscriptEntry[],
	budgetTokens: number
): { transcript: TranscriptEntry[]; trace: { estimatedTokens: number; dropped: string[]; summarized: string[] } } {
	let estimatedTokens = 0;
	const kept: TranscriptEntry[] = [];
	const dropped: string[] = [];
	for (const entry of [...transcript].reverse()) {
		const tokens = estimateTokenCount(JSON.stringify(entry));
		if (estimatedTokens + tokens > budgetTokens) {
			dropped.push(entry.role);
			continue;
		}
		kept.push(entry);
		estimatedTokens += tokens;
	}
	kept.reverse();
	const summarized = dropped.length ? [`messages:${dropped.length}`] : [];
	if (dropped.length) {
		const summary = summarizeTranscript(transcript.slice(0, Math.max(0, transcript.length - kept.length)));
		if (summary) kept.unshift({ role: 'user', content: `Earlier conversation summary:\n${summary}` });
	}
	return { transcript: kept, trace: { estimatedTokens, dropped, summarized } };
}

function summarizeTranscript(entries: TranscriptEntry[]): string {
	return entries
		.slice(-12)
		.map((entry) => {
			if (entry.role === 'user') return `User: ${entry.content}`;
			if (entry.role === 'tool') return `Tool ${entry.toolUseId}: ${entry.status ?? 'ok'}`;
			const text = entry.content
				.filter((block) => block.type === 'text')
				.map((block) => block.text)
				.join(' ');
			return `Assistant: ${text.slice(0, 400)}`;
		})
		.filter(Boolean)
		.join('\n');
}
