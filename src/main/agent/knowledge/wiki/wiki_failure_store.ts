import Store from 'electron-store';
import type { WikiOperationRecord } from './types';
import { wikiPaths } from './wiki_paths';

export interface WikiFailureRegistry {
	version: 1;
	operations: WikiOperationRecord[];
}

export const wikiFailureStore = new Store<WikiFailureRegistry>({
	name: 'failed-operations',
	cwd: wikiPaths().state,
	accessPropertiesByDotNotation: false,
	defaults: { version: 1, operations: [] },
});
