import { wikiRuntime } from './wiki_runtime';

export function stopWiki(): void {
	if (wikiRuntime.task) void wikiRuntime.task.destroy();
	wikiRuntime.controller?.abort();
	wikiRuntime.task = undefined;
	wikiRuntime.logger = undefined;
}
