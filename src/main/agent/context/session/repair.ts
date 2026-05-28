import type { TranscriptEntry } from '../../provider/types';

export function sanitizeToolUseResultPairing(transcript: TranscriptEntry[]): TranscriptEntry[] {
	const repaired: TranscriptEntry[] = [];
	for (let index = 0; index < transcript.length; index++) {
		const entry = transcript[index];
		if (entry.role === 'tool') continue;
		repaired.push(entry);
		if (entry.role !== 'assistant') continue;
		const toolUseIds = entry.content
			.filter((block) => block.type === 'tool_use')
			.map((block) => block.toolUseId);
		if (toolUseIds.length === 0) continue;
		const results = new Map<string, Extract<TranscriptEntry, { role: 'tool' }>>();
		let cursor = index + 1;
		while (cursor < transcript.length && transcript[cursor].role === 'tool') {
			const tool = transcript[cursor] as Extract<TranscriptEntry, { role: 'tool' }>;
			if (toolUseIds.includes(tool.toolUseId)) results.set(tool.toolUseId, normalizeToolResult(tool));
			cursor++;
		}
		for (const toolUseId of toolUseIds) {
			repaired.push(results.get(toolUseId) ?? {
				role: 'tool',
				toolUseId,
				isError: true,
				status: 'error',
				content: [{ type: 'text', text: `Missing result for tool call ${toolUseId}.` }],
			});
		}
		index = cursor - 1;
	}
	return repaired;
}

function normalizeToolResult(
	entry: Extract<TranscriptEntry, { role: 'tool' }>
): Extract<TranscriptEntry, { role: 'tool' }> {
	if (entry.status || entry.isError !== undefined) return entry;
	return { ...entry, status: 'ok' };
}
