import { DEFAULT_PERMISSIONS } from '../../../../../src/main/agent/policy/policy_types';
import { getWikiTools } from '../../../../../src/main/agent/tools/knowledge';
import {
	DEFAULT_WIKI_SETTINGS,
	wikiSettingsStore,
} from '../../../../../src/main/wiki/wiki_settings_store';

describe('wiki tools', () => {
	it('is disabled by default', () => {
		expect(DEFAULT_WIKI_SETTINGS.enabled).toBe(false);
	});

	beforeEach(() => {
		wikiSettingsStore.store = { ...DEFAULT_WIKI_SETTINGS, enabled: true };
	});

	it('registers wiki capabilities only for enabled main sessions', () => {
		expect(getWikiTools('main').map((tool) => tool.name)).toEqual([
			'wiki_ingest_source',
			'wiki_save_analysis',
			'wiki_lint',
			'wiki_review_changes',
			'wiki_rebuild_index',
			'wiki_get_recent_activity',
		]);
		expect(getWikiTools('task')).toEqual([]);

		wikiSettingsStore.store = { ...DEFAULT_WIKI_SETTINGS, enabled: false };
		expect(getWikiTools('main')).toEqual([]);
	});

	it('keeps status reads automatic and mutations approval-gated', () => {
		expect(DEFAULT_PERMISSIONS.wiki_ingest_source).toMatchObject({ default: 'ask' });
		expect(DEFAULT_PERMISSIONS.wiki_save_analysis).toMatchObject({ default: 'ask' });
		expect(DEFAULT_PERMISSIONS.wiki_lint).toMatchObject({ default: 'ask' });
		expect(DEFAULT_PERMISSIONS.wiki_review_changes).toMatchObject({ default: 'ask' });
		expect(DEFAULT_PERMISSIONS.wiki_rebuild_index).toMatchObject({ default: 'ask' });
		expect(DEFAULT_PERMISSIONS.wiki_get_recent_activity).toMatchObject({ default: 'allow' });
	});
});
