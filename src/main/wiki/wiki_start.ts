import { rescheduleWiki } from './wiki_reschedule';
import { getWikiSettings } from './wiki_get_settings';
import { lintWiki } from './wiki_lint';
import { wikiRuntime } from './wiki_runtime';

export function startWiki(logger?: typeof wikiRuntime.logger): void {
	wikiRuntime.logger = logger;
	rescheduleWiki();
	const settings = getWikiSettings();
	if (settings.enabled === true && settings.lintOnStartup === true) {
		void lintWiki(false).catch((error) => logger?.error('Wiki', 'Startup lint failed', error));
	}
}
