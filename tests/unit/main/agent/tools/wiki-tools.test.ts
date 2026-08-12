import { getWikiTools } from '../../../../../src/main/agent/tools/knowledge';
import {
	DEFAULT_WIKI_SETTINGS,
	wikiSettingsStore,
} from '../../../../../src/main/agent/knowledge/wiki/wiki_settings_store';

describe('wiki tools', () => {
	it('is disabled by default', () => {
		expect(DEFAULT_WIKI_SETTINGS.enabled).toBe(false);
	});

	beforeEach(() => {
		wikiSettingsStore.store = { ...DEFAULT_WIKI_SETTINGS, enabled: true };
	});

	it('registers wiki capabilities only for enabled main sessions', () => {
		expect(getWikiTools('main').map((tool) => tool.id)).toEqual([
			'ingest_wiki_source',
			'save_wiki_analysis',
			'lint_wiki',
			'review_wiki_changes',
			'rebuild_wiki_index',
			'get_recent_wiki_activity',
		]);
		expect(getWikiTools('task').map((tool) => tool.id)).toEqual([
			'ingest_wiki_source',
			'save_wiki_analysis',
			'lint_wiki',
			'review_wiki_changes',
			'rebuild_wiki_index',
			'get_recent_wiki_activity',
		]);

		wikiSettingsStore.store = { ...DEFAULT_WIKI_SETTINGS, enabled: false };
		expect(getWikiTools('main')).toEqual([]);
	});

});
