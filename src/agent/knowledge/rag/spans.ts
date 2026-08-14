import { chunkText } from './rag_chunk';
import type { RagChunkSpan } from './types';

export function chunkSpans(text: string): RagChunkSpan[] {
	const normalized = text.replace(/\r\n?/g, '\n').trim();
	let previousStart = -1;
	return chunkText(text).map((chunk) => {
		const start = normalized.indexOf(chunk, Math.max(0, previousStart + 1));
		if (start < 0) {
			return {
				text: chunk,
				lineStart: 1,
				lineEnd: Math.max(1, normalized.split('\n').length),
			};
		}
		previousStart = start;
		const lineStart = normalized.slice(0, start).split('\n').length;
		return {
			text: chunk,
			lineStart,
			lineEnd: lineStart + chunk.split('\n').length - 1,
		};
	});
}
