import type { WikiSettings } from '../../../../shared/wiki_types';
import { normalizeWikiSettings } from './wiki_normalize_settings';
import { rescheduleWiki } from './wiki_reschedule';
import { wikiSettingsStore } from './wiki_settings_store';

export function saveWikiSettings(input: WikiSettings): WikiSettings {
	const settings = normalizeWikiSettings(input);
	wikiSettingsStore.store = structuredClone(settings);
	rescheduleWiki();
	return structuredClone(settings);
}
