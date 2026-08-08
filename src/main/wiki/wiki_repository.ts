import { createHash } from 'node:crypto';
import Store from 'electron-store';
import { realPath } from '../shared/real_path';
import { wikiFailureStore, type WikiFailureRegistry } from './wiki_failure_store';
import { wikiManifestStore, type WikiPageManifest } from './wiki_manifest_store';
import { wikiOperationStore, type WikiOperationRegistry } from './wiki_operation_store';
import { wikiPaths, type WikiPaths } from './wiki_paths';
import { wikiReviewStore, type WikiReviewQueue } from './wiki_review_store';
import { wikiSourceStore, type WikiSourceRegistry } from './wiki_source_store';
import { wikiStateStore } from './wiki_state_store';
import type { WikiState } from './wiki_types';

export interface WikiRepository {
	targetPath: string;
	paths: WikiPaths;
	sources: Store<WikiSourceRegistry>;
	reviews: Store<WikiReviewQueue>;
	operations: Store<WikiOperationRegistry>;
	failures: Store<WikiFailureRegistry>;
	manifest: Store<WikiPageManifest>;
	state: Store<WikiState>;
}

const defaultTargetPath = realPath(wikiPaths().root + '/data');
const defaultRepository: WikiRepository = {
	targetPath: defaultTargetPath,
	paths: wikiPaths(defaultTargetPath),
	sources: wikiSourceStore,
	reviews: wikiReviewStore,
	operations: wikiOperationStore,
	failures: wikiFailureStore,
	manifest: wikiManifestStore,
	state: wikiStateStore,
};
const repositories = new Map<string, WikiRepository>([[defaultTargetPath, defaultRepository]]);

export function getWikiRepository(targetPath: string): WikiRepository {
	const canonicalTarget = realPath(targetPath);
	const existing = repositories.get(canonicalTarget);
	if (existing) return existing;
	const paths = wikiPaths(canonicalTarget);
	const repository: WikiRepository = {
		targetPath: canonicalTarget,
		paths,
		sources: new Store<WikiSourceRegistry>({
			name: 'source-registry',
			cwd: paths.state,
			accessPropertiesByDotNotation: false,
			defaults: { version: 1, sources: {} },
		}),
		reviews: new Store<WikiReviewQueue>({
			name: 'pending-review',
			cwd: paths.state,
			accessPropertiesByDotNotation: false,
			defaults: { version: 1, items: [] },
		}),
		operations: new Store<WikiOperationRegistry>({
			name: 'operations',
			cwd: paths.state,
			accessPropertiesByDotNotation: false,
			defaults: { version: 1, operations: {} },
		}),
		failures: new Store<WikiFailureRegistry>({
			name: 'failed-operations',
			cwd: paths.state,
			accessPropertiesByDotNotation: false,
			defaults: { version: 1, operations: [] },
		}),
		manifest: new Store<WikiPageManifest>({
			name: 'page-manifest',
			cwd: paths.state,
			accessPropertiesByDotNotation: false,
			defaults: { version: 1, pages: {} },
		}),
		state: new Store<WikiState>({
			name: 'state',
			cwd: paths.state,
			accessPropertiesByDotNotation: false,
			defaults: { sources: {} },
		}),
	};
	repositories.set(canonicalTarget, repository);
	return repository;
}
