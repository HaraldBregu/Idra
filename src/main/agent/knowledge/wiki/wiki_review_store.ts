import Store from 'electron-store';
import type { WikiReviewItem } from './types';
import { wikiPaths } from './wiki_paths';

export interface WikiReviewQueue {
	version: 1;
	items: WikiReviewItem[];
}

export const wikiReviewStore = new Store<WikiReviewQueue>({
	name: 'pending-review',
	cwd: wikiPaths().state,
	accessPropertiesByDotNotation: false,
	defaults: { version: 1, items: [] },
});
