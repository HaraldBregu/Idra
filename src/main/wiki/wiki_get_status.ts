import type { WikiStatus } from '../../shared/wiki_types';
import { getWikiState } from './wiki_get_state';
import { wikiRuntime } from './wiki_runtime';
import { wikiSettingsStore } from './wiki_settings_store';
import { wikiReviewStore } from './wiki_review_store';

export function getWikiStatus(): WikiStatus {
	const nextRun = wikiRuntime.task?.getNextRun();
	return {
		running: Boolean(wikiRuntime.run),
		enabled: wikiSettingsStore.store.enabled !== false,
		lastRun: wikiRuntime.lastRun ?? getWikiState().lastRun,
		nextRunAt: nextRun?.toISOString(),
		settingsPath: wikiSettingsStore.path,
		pendingReviews: wikiReviewStore.store.items.filter((item) => item.status === 'pending').length,
	};
}
