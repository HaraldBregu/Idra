import cron from 'node-cron';
import { getWikiSettings } from './wiki_get_settings';
import { runWiki } from './wiki_run';
import { wikiRuntime } from './wiki_runtime';
import { lintWiki } from './wiki_lint';

export function rescheduleWiki(): void {
	if (wikiRuntime.task) {
		void wikiRuntime.task.destroy();
		wikiRuntime.task = undefined;
	}
	const settings = getWikiSettings();
	if (settings.enabled !== true || !settings.schedule.enabled) return;
	wikiRuntime.task = cron.schedule(
		settings.schedule.cronExpression,
		() => {
			void (async () => {
				const result = await runWiki();
				const lint = await lintWiki(false);
				wikiRuntime.logger?.info('Wiki', 'Scheduled maintenance completed', {
					processedSources: result.processedSources,
					criticalFindings: lint.critical.length,
					pendingReview: lint.requiresReview.length,
				});
			})().catch((error) => {
				wikiRuntime.logger?.error('Wiki', 'Scheduled maintenance failed', error);
			});
		},
		{ name: 'wiki:ingest', noOverlap: true }
	);
}
