import { getWikiSettings } from './wiki_get_settings';
import { getWikiRepository } from './wiki_repository';
import type { WikiState } from './types';

export function getWikiState(targetPath = getWikiSettings().targetPath): WikiState {
	return structuredClone(getWikiRepository(targetPath).state.store);
}
