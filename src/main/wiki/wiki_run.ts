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
import { wikiPaths } from './wiki_paths';
import { registerWikiSource } from './wiki_register_source';
import { transactWiki } from './wiki_transaction';
import { wikiSourceStore } from './wiki_source_store';
import { wikiOperationStore } from './wiki_operation_store';
import { wikiFailureStore } from './wiki_failure_store';
import { wikiReviewStore } from './wiki_review_store';
import type { WikiOperationRecord } from './wiki_types';

export async function runWiki(): Promise<WikiRunResult> {
	if (wikiRuntime.run) return wikiRuntime.run;

	wikiRuntime.run = (async () => {
		const settings = getWikiSettings();
		if (settings.enabled === false) {
			return {
				processedSources: 0,
				skippedSources: 0,
				createdPages: 0,
				updatedPages: 0,
				completedAt: new Date().toISOString(),
			};
		}
		if (!settings.providerId || !settings.modelId) {
			throw new Error('Select a wiki provider and model before running.');
		}
		await mkdir(settings.sourcePath, { recursive: true });
		const paths = wikiPaths(settings.targetPath);
		await ensureWikiSchema(settings.targetPath, paths.config);
		const sources = await collectWikiSources(settings.sourcePath);
		if (sources.length === 0) {
			throw new Error(`No supported source documents found in ${settings.sourcePath}.`);
		}

		const state = getWikiState();
		let createdPages = 0;
		let updatedPages = 0;
		const operationIds: string[] = [];
		let processedSources = 0;
		let skippedSources = 0;
		let claimsAdded = 0;
		let contradictionsDetected = 0;
		let pendingReviews = 0;

		for (const discovered of sources) {
			const operationId = `operation-ingest-${discovered.hash.slice(0, 16)}`;
			const registered = await registerWikiSource(discovered, operationId, paths.evidence);
			const source = registered.source;
			if (!registered.isNew && registered.record.status === 'integrated') {
				state.sources[source.relativePath] = source.hash;
				skippedSources += 1;
				continue;
			}
			if (registered.isNew && state.sources[source.relativePath] === source.hash) {
				const registry = wikiSourceStore.store;
				registry.sources[registered.record.sourceId] = {
					...registered.record,
					status: 'integrated',
				};
				wikiSourceStore.store = registry;
				skippedSources += 1;
				continue;
			}

			const startedAt = new Date().toISOString();
			let operation: WikiOperationRecord = {
				id: operationId,
				type: 'ingest',
				status: 'planning',
				startedAt,
				updatedAt: startedAt,
				sourceId: registered.record.sourceId,
				title: source.relativePath,
				createdPages: 0,
				updatedPages: 0,
				claimsAdded: 0,
				contradictionsDetected: 0,
				validationErrors: [],
				reviewStatus: 'not_required',
			};
			wikiOperationStore.store = {
				...wikiOperationStore.store,
				operations: { ...wikiOperationStore.store.operations, [operationId]: operation },
			};

			try {
				const context = await buildWikiContext(settings.targetPath, source);
				const update = await generateWikiUpdate(settings, source, context);
				operation = { ...operation, status: 'executing', updatedAt: new Date().toISOString() };
				wikiOperationStore.store = {
					...wikiOperationStore.store,
					operations: { ...wikiOperationStore.store.operations, [operationId]: operation },
				};
				const applied = await transactWiki({
					targetPath: settings.targetPath,
					operationId,
					apply: async (stagedPath) => {
						const result = await applyWikiUpdate(stagedPath, source, update, {
							operationId,
							requireReviewForMajorChanges: settings.requireReviewForMajorChanges,
						});
						await rebuildWikiIndex(stagedPath);
						await appendWikiLog(stagedPath, source, result, operationId);
						return result;
					},
				});
				const registry = wikiSourceStore.store;
				registry.sources[registered.record.sourceId] = {
					...registry.sources[registered.record.sourceId],
					status: 'integrated',
					operationId,
				};
				wikiSourceStore.store = registry;
				state.sources[source.relativePath] = source.hash;
				createdPages += applied.createdPages;
				updatedPages += applied.updatedPages;
				claimsAdded += applied.claimsAdded ?? 0;
				contradictionsDetected += applied.contradictionsDetected ?? 0;
				pendingReviews += applied.pendingReviews ?? 0;
				if (applied.reviewItems?.length) {
					const current = wikiReviewStore.store.items;
					const ids = new Set(applied.reviewItems.map((item) => item.id));
					wikiReviewStore.store = {
						version: 1,
						items: [...current.filter((item) => !ids.has(item.id)), ...applied.reviewItems],
					};
				}
				processedSources += 1;
				operationIds.push(operationId);
				operation = {
					...operation,
					status: applied.pendingReviews ? 'awaiting_review' : 'completed',
					updatedAt: new Date().toISOString(),
					createdPages: applied.createdPages,
					updatedPages: applied.updatedPages,
					claimsAdded: applied.claimsAdded ?? 0,
					contradictionsDetected: applied.contradictionsDetected ?? 0,
					reviewStatus: applied.pendingReviews ? 'required' : 'not_required',
				};
				wikiOperationStore.store = {
					...wikiOperationStore.store,
					operations: { ...wikiOperationStore.store.operations, [operationId]: operation },
				};
				saveWikiState(state);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				operation = {
					...operation,
					status: 'rolled_back',
					updatedAt: new Date().toISOString(),
					error: message,
				};
				wikiOperationStore.store = {
					...wikiOperationStore.store,
					operations: { ...wikiOperationStore.store.operations, [operationId]: operation },
				};
				const failures = wikiFailureStore.store.operations.filter((item) => item.id !== operationId);
				wikiFailureStore.store = { version: 1, operations: [...failures, operation] };
				const registry = wikiSourceStore.store;
				registry.sources[registered.record.sourceId] = {
					...registry.sources[registered.record.sourceId],
					status: 'failed',
					operationId,
				};
				wikiSourceStore.store = registry;
				throw error;
			}
		}

		if (processedSources === 0) await rebuildWikiIndex(settings.targetPath);
		const result: WikiRunResult = {
			processedSources,
			skippedSources,
			createdPages,
			updatedPages,
			completedAt: new Date().toISOString(),
			operationIds,
			claimsAdded,
			contradictionsDetected,
			pendingReviews,
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
