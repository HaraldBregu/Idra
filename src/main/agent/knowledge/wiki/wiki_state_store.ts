import Store from 'electron-store';
import type { WikiState } from './types';
import { wikiLocation } from './wiki_location';

export const wikiStateStore = new Store<WikiState>({
	name: 'state',
	cwd: wikiLocation(),
	accessPropertiesByDotNotation: false,
	defaults: { sources: {} },
});
