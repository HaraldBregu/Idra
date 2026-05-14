import type { TranscriptEntry } from '../provider/types';

/**
 * Strip orphan tool results and pair every assistant `tool_use` with a
 * matching `tool` result entry; synthesize a stub when missing. The
 * underlying provider APIs (OpenAI / Anthropic) reject conversations
 * where the tool_use / tool_result pairing is broken.
 */
export function sanitizeToolUseResultPairing(transcript: TranscriptEntry[]): TranscriptEntry[] {
	const out: TranscriptEntry[] = [];
	for (let i = 0; i < transcript.length; i++) {
		const entry = transcript[i]!;
		if (entry.role === 'assistant') {
			const toolUseIds = entry.content
				.filter((b) => b.type === 'tool_use' && b.toolUseId)
				.map((b) => b.toolUseId as string);
			if (toolUseIds.length === 0) {
				out.push(entry);
				continue;
			}
			const expected = new Set(toolUseIds);
			const followingResults: TranscriptEntry[] = [];
			let j = i + 1;
			while (j < transcript.length && transcript[j]!.role === 'tool') {
				followingResults.push(transcript[j]!);
				j++;
			}
			const seen = new Set<string>();
			const valid = followingResults.filter((r) => {
				if (r.role !== 'tool') return false;
				if (!expected.has(r.toolUseId)) return false;
				if (seen.has(r.toolUseId)) return false;
				seen.add(r.toolUseId);
				return true;
			});
			out.push(entry);
			for (const id of toolUseIds) {
				const found = valid.find((r) => r.role === 'tool' && r.toolUseId === id);
				if (found) {
					out.push(found);
				} else {
					out.push({
						role: 'tool',
						toolUseId: id,
						content: [
							{ type: 'text', text: '(missing result — synthesized stub during transcript repair)' },
						],
						isError: true,
					});
				}
			}
			i = j - 1;
			continue;
		}
		if (entry.role === 'tool') continue; // orphan
		out.push(entry);
	}
	return out;
}
