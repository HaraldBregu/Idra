import fs from 'node:fs/promises';
import type { Config } from '../types';
import { memoryPath } from './memory_path';

export async function forgetMemory(config: Config, match: string): Promise<{ removed: number }> {
	const filePath = memoryPath(config);
	const text = await fs.readFile(filePath, 'utf8');
	const query = match.trim().toLowerCase();
	if (!query) return { removed: 0 };
	const lines = text.split('\n');
	const kept = lines.filter(
		(line) => !(line.startsWith('- ') && line.toLowerCase().includes(query)),
	);
	const removed = lines.length - kept.length;
	if (removed > 0) await fs.writeFile(filePath, kept.join('\n'), 'utf8');
	return { removed };
}
