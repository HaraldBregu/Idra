import path from 'node:path';
import { z } from 'zod';
import type { WikiUpdate } from './wiki_types';

const wikiUpdateSchema = z.object({
	pages: z
		.array(
			z.object({
				path: z.string().min(1),
				title: z.string().min(1).max(200),
				summary: z.string().min(1).max(500),
				content: z.string().min(1),
				sources: z.array(z.string()).optional().default([]),
			})
		)
		.min(1)
		.max(24),
});

export function parseWikiUpdate(value: unknown, sourcePage: string): WikiUpdate {
	const parsed = wikiUpdateSchema.parse(value);
	const pages = parsed.pages.map((page) => {
		const normalized = path.posix.normalize(page.path.replaceAll('\\', '/').replace(/^\.\//, ''));
		if (
			path.posix.isAbsolute(normalized) ||
			normalized === '..' ||
			normalized.startsWith('../') ||
			path.posix.extname(normalized).toLowerCase() !== '.md' ||
			['index.md', 'log.md', 'AGENTS.md'].includes(normalized)
		) {
			throw new Error(`Unsafe wiki page path: ${page.path}`);
		}
		return {
			...page,
			path: normalized,
			title: page.title.trim(),
			summary: page.summary.trim(),
			content: page.content.trim(),
			sources: page.sources.map((source) => source.trim()).filter(Boolean),
		};
	});
	if (!pages.some((page) => page.path === sourcePage)) {
		throw new Error(`Wiki update did not include the required source page: ${sourcePage}`);
	}
	return { pages };
}
