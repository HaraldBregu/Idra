import type { WikiState } from './wiki_types';
import { wikiStateStore } from './wiki_state_store';

export function saveWikiState(state: WikiState): void {
	wikiStateStore.store = structuredClone(state);
}
