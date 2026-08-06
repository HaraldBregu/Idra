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
		const previous = existing ? matter(existing) : undefined;
		const previousSources = previous?.data.sources ?? [];
		const previousSourceIds = previous?.data.source_ids ?? [];
		const sources = [
			...new Set([
				...(Array.isArray(previousSources) ? previousSources.map(String) : []),
				...page.sources,
				source.relativePath,
			]),
		].sort();
		const sourceIds = [
			...new Set([
				...(Array.isArray(previousSourceIds) ? previousSourceIds.map(String) : []),
				...(source.sourceId ? [source.sourceId] : []),
			]),
		].sort();
		const body = /^#\s/m.test(page.content)
			? page.content
			: `# ${page.title}\n\n${page.content}`;
		const pageId =
			page.id ??
			page.path
				.slice(0, -3)
				.replace(/[^a-zA-Z0-9]+/g, '-')
				.replace(/^-|-$/g, '')
				.toLowerCase();
		const createdAt = String(previous?.data.created_at ?? new Date().toISOString());
		const markdown = matter.stringify(`${body.trim()}\n`, {
			id: pageId,
			title: page.title,
			page_type: page.pageType ?? (page.path.startsWith('sources/') ? 'source' : 'topic'),
			status: page.status ?? 'active',
			summary: page.summary,
			updated: new Date().toISOString(),
			created_at: createdAt,
			updated_at: new Date().toISOString(),
			sources,
			source_ids: sourceIds,
			tags: page.tags ?? previous?.data.tags ?? [],
			aliases: page.aliases ?? previous?.data.aliases ?? [],
			related: page.related ?? previous?.data.related ?? [],
			confidence: page.confidence ?? previous?.data.confidence ?? 'medium',
			review_status: previous?.data.review_status ?? 'auto_generated',
		});
		await mkdir(path.dirname(pagePath), { recursive: true });
		await writeFile(pagePath, markdown, 'utf8');
		if (existing === undefined) createdPages += 1;
		else updatedPages += 1;
	}

	return { createdPages, updatedPages };
}
