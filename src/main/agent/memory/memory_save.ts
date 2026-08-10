import fs from 'node:fs/promises';
import type { Config } from '../types';
import { memoryPath } from './memory_path';
import { parseMemories } from './memory_parse';
import { memoryRecord } from './memory_record';
import type { MemoryFact } from './memory_types';
import { atomicWrite } from '../../shared/atomic_write';

export async function saveMemory(
	config: Config,
	fact: string
): Promise<{ saved: boolean; memory: MemoryFact }> {
	const filePath = memoryPath(config);
	const text = await fs.readFile(filePath, 'utf8');
	const memory = memoryRecord(fact);
	if (parseMemories(text).some((entry) => entry.id === memory.id)) {
		return { saved: false, memory };
	}
	const entry = `- [${memory.id}] ${memory.fact}`;
	const separator = text.endsWith('\n') ? '' : '\n';
	await atomicWrite(filePath, `${text}${separator}${entry}\n`);
	return { saved: true, memory };
}
