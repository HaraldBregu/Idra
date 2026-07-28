import cron from 'node-cron';
import { getWikiSettings } from './wiki_get_settings';
import { runWiki } from './wiki_run';
import { wikiRuntime } from './wiki_runtime';

export function rescheduleWiki(): void {
	if (wikiRuntime.task) {
		void wikiRuntime.task.destroy();
		wikiRuntime.task = undefined;
	}
	const settings = getWikiSettings();
	if (!settings.schedule.enabled) return;
	wikiRuntime.task = cron.schedule(
		settings.schedule.cronExpression,
		() => {
			void runWiki().catch((error) => {
				console.error('[Wiki] Scheduled run failed', error);
			});
		},
		{ name: 'wiki:ingest', noOverlap: true }
	);
}
