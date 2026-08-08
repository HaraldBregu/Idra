import { createHash } from 'node:crypto';
import type { StoredMemoryFact } from './memory_types';

export function parseMemories(text: string): StoredMemoryFact[] {
	const records: StoredMemoryFact[] = [];
	for (const [lineIndex, line] of text.split('\n').entries()) {
		const structured = line.match(/^- \[memory-[a-f0-9]{16}\] (.+)$/i);
		const legacy = structured ? undefined : line.match(/^- (.+)$/);
		const fact = (structured?.[1] ?? legacy?.[1] ?? '').trim().replace(/\s+/gu, ' ');
		if (!fact) continue;
		const digest = createHash('sha256').update(fact).digest('hex').slice(0, 16);
		records.push({ id: `memory-${digest}`, fact, lineIndex });
	}
	return records;
}
