import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { WikiUpdate } from './types';

const evidenceSchema = z.object({
	sourceId: z.string().trim().min(1),
	locator: z.string().trim().min(1).max(300),
	evidenceType: z.enum(['direct', 'indirect']),
});

const claimSchema = z.object({
	id: z.string().trim().optional().default(''),
	statement: z.string().trim().min(1).max(2000),
	evidence: z.array(evidenceSchema).min(1),
	confidence: z.enum(['low', 'medium', 'high']),
	status: z.enum(['supported', 'disputed', 'superseded', 'unverified']),
	contradicts: z.array(z.string().trim().min(1)).optional(),
});

const contradictionSchema = z.object({
	id: z.string().trim().optional().default(''),
	claimIds: z.array(z.string().trim().min(1)).min(2),
	description: z.string().trim().min(1).max(2000),
	status: z
		.enum([
			'unresolved',
			'explained-by-scope',
			'explained-by-time',
			'source-corrected',
			'superseded',
			'resolved-by-review',
		])
		.default('unresolved'),
	requiredFollowUp: z.string().trim().max(1000).optional(),
});

const wikiUpdateSchema = z.object({
	pages: z
		.array(
			z.object({
				path: z.string().min(1),
				title: z.string().min(1).max(200),
				summary: z.string().min(1).max(500),
				content: z.string().min(1),
				sources: z.array(z.string()).optional().default([]),
				sourceIds: z.array(z.string().trim().min(1)).optional(),
				id: z.string().trim().optional(),
				pageType: z
					.enum([
						'source',
						'entity',
						'concept',
						'topic',
						'project',
						'comparison',
						'synthesis',
						'question',
					])
					.optional(),
				status: z.enum(['active', 'draft', 'superseded']).optional(),
				tags: z.array(z.string().trim().min(1)).optional(),
				aliases: z.array(z.string().trim().min(1)).optional(),
				related: z.array(z.string().trim().min(1)).optional(),
				confidence: z.enum(['low', 'medium', 'high']).optional(),
				claims: z.array(claimSchema).optional(),
				contradictions: z.array(contradictionSchema).optional(),
				openQuestions: z.array(z.string().trim().min(1)).optional(),
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
			sourceIds: [...new Set(page.sourceIds ?? [])],
			tags: [...new Set(page.tags ?? [])],
			aliases: [...new Set(page.aliases ?? [])],
			related: [...new Set(page.related ?? [])],
			claims: (page.claims ?? []).map((claim) => ({
				...claim,
				id: /^claim-[a-z0-9-]+$/i.test(claim.id)
					? claim.id.toLowerCase()
					: `claim-${createHash('sha256').update(claim.statement.toLowerCase()).digest('hex').slice(0, 12)}`,
				contradicts: [...new Set(claim.contradicts ?? [])],
			})),
			contradictions: (page.contradictions ?? []).map((contradiction) => ({
				...contradiction,
				id: /^contradiction-[a-z0-9-]+$/i.test(contradiction.id)
					? contradiction.id.toLowerCase()
					: `contradiction-${createHash('sha256').update(contradiction.claimIds.sort().join(':')).digest('hex').slice(0, 12)}`,
			})),
			openQuestions: [...new Set(page.openQuestions ?? [])],
		};
	});
	if (!pages.some((page) => page.path === sourcePage)) {
		throw new Error(`Wiki update did not include the required source page: ${sourcePage}`);
	}
	return { pages };
}
