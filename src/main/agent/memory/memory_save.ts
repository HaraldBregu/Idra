import fs from 'node:fs/promises';
import type { Config } from '../types';
import { memoryPath } from './memory_path';

export async function saveMemory(config: Config, fact: string): Promise<{ saved: boolean }> {
	const filePath = memoryPath(config);
	const text = await fs.readFile(filePath, 'utf8');
	const entry = `- ${fact.trim()}`;
	if (text.split('\n').includes(entry)) return { saved: false };
	const separator = text.endsWith('\n') ? '' : '\n';
	await fs.writeFile(filePath, `${text}${separator}${entry}\n`, 'utf8');
	return { saved: true };
}
