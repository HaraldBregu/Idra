import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getWikiSettings } from './wiki_get_settings';
import { wikiPaths } from './wiki_paths';

export async function loadWikiPolicy(
	operation: 'ingest' | 'save_analysis' | 'lint' | 'review'
): Promise<string> {
	const paths = wikiPaths(getWikiSettings().targetPath);
	const schema = await readFile(path.resolve(paths.config, 'schema.yaml'), 'utf8').catch(() => '');
	const operationPolicy =
		operation === 'review'
			? await readFile(path.resolve(paths.config, 'review-policy.yaml'), 'utf8').catch(() => '')
			: await readFile(path.resolve(paths.config, 'page-types.yaml'), 'utf8').catch(() => '');
	return [schema, operationPolicy].filter(Boolean).join('\n\n').slice(0, 12_000);
}
