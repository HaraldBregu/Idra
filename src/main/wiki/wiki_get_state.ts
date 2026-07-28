import type { WikiState } from './wiki_types';
import { wikiStateStore } from './wiki_state_store';

export function getWikiState(): WikiState {
	return structuredClone(wikiStateStore.store);
}
