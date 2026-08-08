import fs from 'node:fs/promises';
import type { Config } from '../types';
import { parseMemories } from './memory_parse';
import { memoryPath } from './memory_path';

export async function forgetMemory(
	config: Config,
	id: string
): Promise<{ removed: boolean; id: string }> {
	const filePath = memoryPath(config);
	const text = await fs.readFile(filePath, 'utf8');
	const memoryId = id.trim().toLowerCase();
	if (!/^memory-[a-f0-9]{16}$/.test(memoryId)) throw new Error('A valid memory ID is required.');
	const matchingLines = new Set(
		parseMemories(text)
			.filter((memory) => memory.id === memoryId)
			.map((memory) => memory.lineIndex)
	);
	if (matchingLines.size === 0) return { removed: false, id: memoryId };
	const lines = text.split('\n');
	const kept = lines.filter((_line, lineIndex) => !matchingLines.has(lineIndex));
	await fs.writeFile(filePath, kept.join('\n'), 'utf8');
	return { removed: true, id: memoryId };
}
