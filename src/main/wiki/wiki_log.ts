import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import type { WikiApplyResult, WikiSource } from './wiki_types';

export async function appendWikiLog(
	targetPath: string,
	source: WikiSource,
	result: WikiApplyResult
): Promise<void> {
	const now = new Date();
	const date = now.toISOString().slice(0, 10);
	const entry = `## [${date}] ingest | ${source.relativePath}

- Source hash: \`${source.hash}\`
- Pages created: ${result.createdPages}
- Pages updated: ${result.updatedPages}
- Completed: ${now.toISOString()}

`;
	await appendFile(path.resolve(targetPath, 'log.md'), entry, 'utf8');
}
