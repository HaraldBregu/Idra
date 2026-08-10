import { getWikiSettings } from './wiki_get_settings';
import { getWikiRepository } from './wiki_repository';
import type { WikiState } from './types';

export function saveWikiState(state: WikiState, targetPath = getWikiSettings().targetPath): void {
	getWikiRepository(targetPath).state.store = structuredClone(state);
}
