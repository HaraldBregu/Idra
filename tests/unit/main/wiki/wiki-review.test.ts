import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import { applyWikiUpdate } from '../../../../src/main/wiki/wiki_apply_update';
import type { WikiSource } from '../../../../src/main/wiki/wiki_types';

const sourceA: WikiSource = {
	absolutePath: '/tmp/raw/a.md',
	relativePath: 'a.md',
	content: 'Alpha evidence',
	hash: 'a'.repeat(64),
	sourceId: 'source-aaaaaaaaaaaaaaaa',
};

const sourceB: WikiSource = {
	absolutePath: '/tmp/raw/b.md',
	relativePath: 'b.md',
	content: 'Beta evidence',
	hash: 'b'.repeat(64),
	sourceId: 'source-bbbbbbbbbbbbbbbb',
};

describe('incremental wiki knowledge integration', () => {
	it('enriches one concept page with claim-level evidence from multiple sources', async () => {
		const target = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-claims-'));
		await applyWikiUpdate(target, sourceA, {
			pages: [
				{
					path: 'concepts/agent-memory.md',
					title: 'Agent memory',
					pageType: 'concept',
					summary: 'Durable assistant memory.',
					content: 'Source A explains durable memory.',
					sources: ['a.md'],
					claims: [
						{
							id: 'claim-memory-durable',
							statement: 'Compiled knowledge persists across sessions.',
							evidence: [
								{ sourceId: sourceA.sourceId!, locator: 'Memory section', evidenceType: 'direct' },
							],
							confidence: 'high',
							status: 'supported',
						},
					],
				},
			],
		});
		await applyWikiUpdate(target, sourceB, {
			pages: [
				{
					path: 'concepts/agent-memory.md',
					title: 'Agent memory',
					pageType: 'concept',
					summary: 'Durable assistant memory with retrieval.',
					content: 'Source B adds retrieval behavior.',
					sources: ['b.md'],
					claims: [
						{
							id: 'claim-memory-retrieval',
							statement: 'Compiled pages should be retrieved before raw evidence.',
							evidence: [
								{ sourceId: sourceB.sourceId!, locator: 'Query section', evidenceType: 'direct' },
							],
							confidence: 'high',
							status: 'supported',
						},
					],
				},
			],
		});

		const page = matter(await readFile(path.join(target, 'concepts/agent-memory.md'), 'utf8'));
		expect(page.data.source_ids).toEqual([sourceA.sourceId, sourceB.sourceId]);
		expect(page.data.claims).toHaveLength(2);
		expect(page.content).toContain('Source A explains durable memory.');
		expect(page.content).toContain('Source B adds retrieval behavior.');
	});

	it('preserves unresolved contradictions when an automatic update tries to resolve them', async () => {
		const target = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-contradiction-'));
		const claims = [
			{
				id: 'claim-market-a',
				statement: 'The market is 4.2 billion euros.',
				evidence: [{ sourceId: sourceA.sourceId!, locator: 'Page 4', evidenceType: 'direct' as const }],
				confidence: 'medium' as const,
				status: 'disputed' as const,
			},
			{
				id: 'claim-market-b',
				statement: 'The market is 6.1 billion euros.',
				evidence: [{ sourceId: sourceB.sourceId!, locator: 'Page 8', evidenceType: 'direct' as const }],
				confidence: 'medium' as const,
				status: 'disputed' as const,
			},
		];
		await applyWikiUpdate(target, sourceA, {
			pages: [
				{
					path: 'topics/market.md',
					title: 'Market',
					summary: 'Conflicting market estimates.',
					content: 'Two estimates use different definitions.',
					sources: ['a.md', 'b.md'],
					claims,
					contradictions: [
						{
							id: 'contradiction-market-size',
							claimIds: claims.map((claim) => claim.id),
							description: 'The 2025 market-size estimates disagree.',
							status: 'unresolved',
						},
					],
				},
			],
		});
		await applyWikiUpdate(target, sourceB, {
			pages: [
				{
					path: 'topics/market.md',
					title: 'Market',
					summary: 'Conflicting market estimates.',
					content: 'The disagreement still requires review.',
					sources: ['b.md'],
					claims,
					contradictions: [
						{
							id: 'contradiction-market-size',
							claimIds: claims.map((claim) => claim.id),
							description: 'The 2025 market-size estimates disagree.',
							status: 'resolved-by-review',
						},
					],
				},
			],
		});

		const page = matter(await readFile(path.join(target, 'topics/market.md'), 'utf8'));
		expect(page.data.claims).toHaveLength(2);
		expect(page.data.contradictions[0].status).toBe('unresolved');
		expect(page.content).toContain('Status: unresolved');
	});

	it('adds reciprocal relationships between pages in one change set', async () => {
		const target = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-links-'));
		await applyWikiUpdate(target, sourceA, {
			pages: [
				{
					path: 'concepts/alpha.md',
					title: 'Alpha',
					summary: 'Alpha concept.',
					content: 'Alpha is related to [[Beta]].',
					sources: ['a.md'],
				},
				{
					path: 'concepts/beta.md',
					title: 'Beta',
					summary: 'Beta concept.',
					content: 'Beta details.',
					sources: ['a.md'],
				},
			],
		});

		const beta = matter(await readFile(path.join(target, 'concepts/beta.md'), 'utf8'));
		expect(beta.data.related).toContain('[[Alpha]]');
		expect(beta.content).toContain('- [[Alpha]]');
	});

	it('queues a major synthesis rewrite instead of applying it', async () => {
		const target = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-review-'));
		const original = 'Original evidence-backed synthesis. '.repeat(30);
		await applyWikiUpdate(target, sourceA, {
			pages: [
				{
					path: 'syntheses/strategy.md',
					title: 'Strategy',
					pageType: 'synthesis',
					summary: 'Current strategy.',
					content: original,
					sources: ['a.md'],
				},
			],
		});
		const result = await applyWikiUpdate(
			target,
			sourceB,
			{
				pages: [
					{
						path: 'syntheses/strategy.md',
						title: 'Strategy',
						pageType: 'synthesis',
						summary: 'Proposed replacement strategy.',
						content: 'A completely different synthesis. '.repeat(30),
						sources: ['b.md'],
					},
				],
			},
			{ operationId: 'operation-review', requireReviewForMajorChanges: true }
		);

		expect(result).toMatchObject({ updatedPages: 0, pendingReviews: 1 });
		expect(result.reviewItems?.[0]).toMatchObject({ risk: 'high', status: 'pending' });
		expect(await readFile(path.join(target, 'syntheses/strategy.md'), 'utf8')).toContain(original);
	});
});
