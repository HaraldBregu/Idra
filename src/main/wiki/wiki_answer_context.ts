import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { getWikiSettings } from './wiki_get_settings';
import { searchWiki } from './wiki_search';
import { wikiSourceStore } from './wiki_source_store';
import type {
	WikiAnswerContext,
	WikiContradiction,
	WikiRawEvidenceResult,
} from './wiki_types';

export async function buildWikiAnswerContext(
	query: string,
	includeRaw = false,
	targetPath = getWikiSettings().targetPath
): Promise<WikiAnswerContext> {
	const compiledWiki = await searchWiki(query, 5, targetPath);
	const contradictions: WikiContradiction[] = [];
	for (const page of compiledWiki) {
		const parsed = matter(await readFile(path.resolve(targetPath, page.path), 'utf8'));
		if (Array.isArray(parsed.data.contradictions)) {
			for (const contradiction of parsed.data.contradictions as WikiContradiction[]) {
				if (!contradictions.some((item) => item.id === contradiction.id)) contradictions.push(contradiction);
			}
		}
	}
	const shouldReadRaw = includeRaw || compiledWiki.length === 0 || compiledWiki[0].confidence < 0.65;
	const primaryEvidence: WikiRawEvidenceResult[] = [];
	if (shouldReadRaw) {
		const sourceIds = [
			...new Set(
				compiledWiki.length > 0
					? compiledWiki.flatMap((page) => page.sourceIds)
					: Object.keys(wikiSourceStore.store.sources)
			),
		].slice(0, 4);
		const term = query.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/u)?.[0] ?? '';
		for (const sourceId of sourceIds) {
			const record = wikiSourceStore.store.sources[sourceId];
			if (!record || record.status !== 'integrated') continue;
			const content = await readFile(record.archivePath, 'utf8').catch(() => '');
			if (!content) continue;
			const match = term ? content.toLowerCase().indexOf(term) : -1;
			const start = Math.max(0, match < 0 ? 0 : match - 500);
			primaryEvidence.push({
				contentType: 'raw_source' as const,
				sourceId,
				locator: record.originalName,
				text: content.slice(start, start + 2_000),
				confidence: match >= 0 ? 0.8 : 0.55,
			});
		}
	}
	const limitations: string[] = [];
	if (compiledWiki.length === 0) limitations.push('No compiled wiki page matched the query.');
	else if (compiledWiki[0].confidence < 0.65)
		limitations.push('The best compiled wiki match has low confidence.');
	if (contradictions.some((item) => item.status === 'unresolved')) {
		limitations.push('Relevant wiki pages contain unresolved contradictions.');
	}
	if (shouldReadRaw && primaryEvidence.length === 0) {
		limitations.push('No managed raw evidence was available for fallback verification.');
	}
	return { query: query.trim(), compiledWiki, primaryEvidence, contradictions, limitations };
}
