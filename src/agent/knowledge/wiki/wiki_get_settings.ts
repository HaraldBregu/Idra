import type { WikiSettings } from '../../../shared/wiki_types';
import { wikiSettingsStore } from './wiki_settings_store';

export function getWikiSettings(): WikiSettings {
	return structuredClone(wikiSettingsStore.store);
}
