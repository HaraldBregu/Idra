import Store from 'electron-store';
import type { WikiOperationRecord } from './wiki_types';
import { wikiPaths } from './wiki_paths';

export interface WikiOperationRegistry {
	version: 1;
	operations: Record<string, WikiOperationRecord>;
}

export const wikiOperationStore = new Store<WikiOperationRegistry>({
	name: 'operations',
	cwd: wikiPaths().state,
	accessPropertiesByDotNotation: false,
	defaults: { version: 1, operations: {} },
});
