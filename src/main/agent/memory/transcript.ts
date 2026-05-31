import type { TranscriptEntry } from '../provider/types';
import { DEFAULT_MAX_CHARS, SESSION_TOOL_RESULT_CHARS } from './constants';

export function sanitizeTranscriptForMemory(transcript: TranscriptEntry[]): Array<{
	index: number;
	role: TranscriptEntry['role'];
	text: string;
}> {
	return transcript.map((entry, index) => ({
		index,
		role: entry.role,
		text: renderTranscriptEntry(entry),
	}));
}

function renderTranscriptEntry(entry: TranscriptEntry): string {
	if (entry.role === 'user') return truncate(entry.content, DEFAULT_MAX_CHARS);
	if (entry.role === 'assistant') {
		return entry.content
			.map((block) => {
				if (block.type === 'text') return block.text;
				if (block.type === 'reasoning') return '';
				return `[tool_call ${block.toolName} ${truncate(JSON.stringify(block.toolArgs ?? {}), 500)}]`;
			})
			.join('\n')
			.trim();
	}
	return entry.content
		.map((block) => {
			if (block.type === 'image') return '[image result omitted]';
			return truncate(block.text ?? '', SESSION_TOOL_RESULT_CHARS);
		})
		.join('\n')
		.trim();
}

function truncate(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)} [truncated ${value.length - maxChars} chars]`;
}
