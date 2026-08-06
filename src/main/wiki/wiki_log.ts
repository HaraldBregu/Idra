import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { WikiApplyResult, WikiSource } from './wiki_types';

export async function appendWikiLog(
	targetPath: string,
	source: WikiSource,
	result: WikiApplyResult,
	operationId?: string
): Promise<void> {
	const logPath = path.resolve(targetPath, 'log.md');
	if (operationId) {
		const existing = await readFile(logPath, 'utf8').catch(() => '');
		if (existing.includes(`- Operation ID: ${operationId}`)) return;
	}
	const now = new Date();
	const date = now.toISOString().slice(0, 10);
	const entry = `## [${date}] ingest | ${source.relativePath}

- Source hash: \`${source.hash}\`
- Source ID: ${source.sourceId ?? 'legacy'}
- Pages created: ${result.createdPages}
- Pages updated: ${result.updatedPages}
- Operation ID: ${operationId ?? 'legacy'}
- Completed: ${now.toISOString()}

`;
	await appendFile(logPath, entry, 'utf8');
}
