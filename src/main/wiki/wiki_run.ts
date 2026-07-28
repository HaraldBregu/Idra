import { mkdir } from 'node:fs/promises';
import type { WikiRunResult } from '../../shared/wiki_types';
import { applyWikiUpdate } from './wiki_apply_update';
import { collectWikiSources } from './wiki_collect_sources';
import { buildWikiContext } from './wiki_context';
import { generateWikiUpdate } from './wiki_generate';
import { getWikiSettings } from './wiki_get_settings';
import { getWikiState } from './wiki_get_state';
import { rebuildWikiIndex } from './wiki_index';
import { appendWikiLog } from './wiki_log';
import { wikiRuntime } from './wiki_runtime';
import { ensureWikiSchema } from './wiki_schema';
import { saveWikiState } from './wiki_save_state';

export async function runWiki(): Promise<WikiRunResult> {
	if (wikiRuntime.run) return wikiRuntime.run;

	wikiRuntime.run = (async () => {
		const settings = getWikiSettings();
		if (!settings.providerId || !settings.modelId) {
			throw new Error('Select a wiki provider and model before running.');
		}
		await mkdir(settings.sourcePath, { recursive: true });
		await ensureWikiSchema(settings.targetPath);
		const sources = await collectWikiSources(settings.sourcePath);
		if (sources.length === 0) {
			throw new Error(`No supported source documents found in ${settings.sourcePath}.`);
		}

		const state = getWikiState();
		const changed = sources.filter((source) => state.sources[source.relativePath] !== source.hash);
		let createdPages = 0;
		let updatedPages = 0;

		for (const source of changed) {
			const context = await buildWikiContext(settings.targetPath, source);
			const update = await generateWikiUpdate(settings, source, context);
			const applied = await applyWikiUpdate(settings.targetPath, source, update);
			await rebuildWikiIndex(settings.targetPath);
			await appendWikiLog(settings.targetPath, source, applied);
			state.sources[source.relativePath] = source.hash;
			createdPages += applied.createdPages;
			updatedPages += applied.updatedPages;
			saveWikiState(state);
		}

		if (changed.length === 0) await rebuildWikiIndex(settings.targetPath);
		const result: WikiRunResult = {
			processedSources: changed.length,
			skippedSources: sources.length - changed.length,
			createdPages,
			updatedPages,
			completedAt: new Date().toISOString(),
		};
		state.lastRun = result;
		saveWikiState(state);
		wikiRuntime.lastRun = result;
		return result;
	})();

	try {
		return await wikiRuntime.run;
	} finally {
		wikiRuntime.run = undefined;
	}
}
