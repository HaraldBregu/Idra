import Store from 'electron-store';
import type { WikiOperationRegistry } from './types';
import { wikiPaths } from './wiki_paths';

export const wikiOperationStore = new Store<WikiOperationRegistry>({
	name: 'operations',
	cwd: wikiPaths().state,
	accessPropertiesByDotNotation: false,
	defaults: { version: 1, operations: {} },
});
