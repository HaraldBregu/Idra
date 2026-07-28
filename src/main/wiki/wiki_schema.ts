import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const WIKI_SCHEMA = `# Wiki maintainer schema

This directory is an LLM-maintained knowledge layer. Humans curate immutable raw sources; the wiki compiler owns generated pages.

## Conventions

- Keep pages in Markdown with YAML frontmatter containing \`title\`, \`summary\`, \`updated\`, and \`sources\`.
- Use Obsidian-style \`[[Page links]]\` for entities, concepts, comparisons, and source summaries.
- Store source summaries under \`sources/\`.
- Preserve source provenance and distinguish evidence from synthesis.
- Record conflicts under a "Contradictions and open questions" section instead of silently choosing a claim.
- \`index.md\` is the content catalog and \`log.md\` is the append-only operation history.

## Ingest

Read the index first, update the source summary and all affected pages, add cross-references, rebuild the index, and append the log.

## Query

Read the index, follow relevant pages and their sources, answer with citations, and file durable new synthesis back into the wiki when appropriate.

## Lint

Check for contradictions, stale claims, orphan pages, missing concepts, broken cross-references, and evidence gaps.
`;

export async function ensureWikiSchema(targetPath: string): Promise<void> {
	await mkdir(targetPath, { recursive: true });
	await writeFile(path.resolve(targetPath, 'AGENTS.md'), WIKI_SCHEMA, {
		encoding: 'utf8',
		flag: 'wx',
	}).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== 'EEXIST') throw error;
	});
}
