import fs from 'node:fs/promises';
import type { Config } from '../types';
import { parseMemories } from './memory_parse';
import { memoryPath } from './memory_path';
import type { MemoryFact } from './memory_types';

export async function listMemories(config: Config): Promise<MemoryFact[]> {
	const text = await fs.readFile(memoryPath(config), 'utf8');
	const memories = new Map<string, MemoryFact>();
	for (const { id, fact } of parseMemories(text)) {
		if (!memories.has(id)) memories.set(id, { id, fact });
	}
	return [...memories.values()];
}
