import Store from 'electron-store';
import type { WikiSourceRecord } from './types';
import { wikiPaths } from './wiki_paths';

export interface WikiSourceRegistry {
	version: 1;
	sources: Record<string, WikiSourceRecord>;
}

export const wikiSourceStore = new Store<WikiSourceRegistry>({
	name: 'source-registry',
	cwd: wikiPaths().state,
	accessPropertiesByDotNotation: false,
	defaults: { version: 1, sources: {} },
});
