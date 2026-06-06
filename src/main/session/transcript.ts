import type { TranscriptEntry } from '../../llm/types';
import { sanitizeToolUseResultPairing } from './repair';
import type { SessionFile } from './types';
import { MAX_TOOL_RESULT_CHARS } from './common';

function truncateText(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)}\n[truncated ${value.length - maxChars} chars]`;
}

export function sanitizeTranscriptForStorage(transcript: TranscriptEntry[]): TranscriptEntry[] {
	return transcript.map((entry) => {
		if (entry.role !== 'tool') return entry;
		return {
			...entry,
			content: entry.content.map((block) => {
				if (block.type === 'image') {
					return {
						type: 'text' as const,
						text: `[image result omitted${block.mimeType ? `: ${block.mimeType}` : ''}]`,
					};
				}
				return {
					type: 'text' as const,
					text: truncateText(block.text ?? '', MAX_TOOL_RESULT_CHARS),
				};
			}),
		};
	});
}

export function normalizeLoadedSession(parsed: SessionFile, file: string): SessionFile {
	parsed.sessionFile = parsed.sessionFile ?? file;
	parsed.transcript = sanitizeTranscriptForStorage(
		sanitizeToolUseResultPairing(parsed.transcript ?? [])
	);
	parsed.plan ??= [];
	parsed.compactionMarkers ??= [];
	return parsed;
}
