import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { WikiApplyResult, WikiSource, WikiUpdate } from './wiki_types';

export async function applyWikiUpdate(
	targetPath: string,
	source: WikiSource,
	update: WikiUpdate
): Promise<WikiApplyResult> {
	let createdPages = 0;
	let updatedPages = 0;

	for (const page of update.pages) {
		const pagePath = path.resolve(targetPath, page.path);
		const existing = await readFile(pagePath, 'utf8').catch(() => undefined);
		const previousSources = existing ? matter(existing).data.sources : [];
		const sources = [
			...new Set([
				...(Array.isArray(previousSources) ? previousSources.map(String) : []),
				...page.sources,
				source.relativePath,
			]),
		].sort();
		const body = /^#\s/m.test(page.content)
			? page.content
			: `# ${page.title}\n\n${page.content}`;
		const markdown = matter.stringify(`${body.trim()}\n`, {
			title: page.title,
			summary: page.summary,
			updated: new Date().toISOString(),
			sources,
		});
		await mkdir(path.dirname(pagePath), { recursive: true });
		await writeFile(pagePath, markdown, 'utf8');
		if (existing === undefined) createdPages += 1;
		else updatedPages += 1;
	}

	return { createdPages, updatedPages };
}
