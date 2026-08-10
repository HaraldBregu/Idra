import Store from 'electron-store';
import type { WikiPageManifestEntry } from './types';
import { wikiPaths } from './wiki_paths';

export interface WikiPageManifest {
	version: 1;
	pages: Record<string, WikiPageManifestEntry>;
}

export const wikiManifestStore = new Store<WikiPageManifest>({
	name: 'page-manifest',
	cwd: wikiPaths().state,
	accessPropertiesByDotNotation: false,
	defaults: { version: 1, pages: {} },
});
