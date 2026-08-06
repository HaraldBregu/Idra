import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { wikiPaths } from './wiki_paths';

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

const SCHEMA_POLICY = `version: 1
source_immutability: required
page_format: markdown_yaml_frontmatter
required_metadata:
  - id
  - title
  - page_type
  - status
  - created_at
  - updated_at
  - source_ids
  - confidence
  - review_status
link_format: "[[Page title]]"
citation_format: claim_level
operation_states:
  - pending
  - planning
  - executing
  - validating
  - awaiting_review
  - completed
  - failed
  - rolled_back
failure_recovery: staged_atomic_replace
`;

const PAGE_TYPES = `version: 1
page_types:
  - source
  - entity
  - concept
  - topic
  - project
  - comparison
  - synthesis
  - question
filename: lowercase-kebab-case.md
`;

const REVIEW_POLICY = `version: 1
automatic:
  - create_source_summary
  - add_supporting_evidence
  - add_links
  - update_index
  - append_log
  - detect_contradictions
requires_review:
  - delete_page
  - merge_entity
  - rename_canonical_entity
  - resolve_material_contradiction
  - rewrite_major_synthesis
  - change_schema
  - remove_source_reference
  - settle_disputed_claim
`;

export async function ensureWikiSchema(targetPath: string): Promise<void> {
	const paths = wikiPaths();
	await Promise.all([
		mkdir(targetPath, { recursive: true }),
		mkdir(paths.evidence, { recursive: true }),
		mkdir(paths.state, { recursive: true }),
		mkdir(paths.config, { recursive: true }),
	]);
	const files = [
		[path.resolve(targetPath, 'AGENTS.md'), WIKI_SCHEMA],
		[path.resolve(paths.config, 'schema.yaml'), SCHEMA_POLICY],
		[path.resolve(paths.config, 'page-types.yaml'), PAGE_TYPES],
		[path.resolve(paths.config, 'review-policy.yaml'), REVIEW_POLICY],
	] as const;
	await Promise.all(
		files.map(([file, content]) =>
			writeFile(file, content, { encoding: 'utf8', flag: 'wx' }).catch(
				(error: NodeJS.ErrnoException) => {
					if (error.code !== 'EEXIST') throw error;
				}
			)
		)
	);
}
