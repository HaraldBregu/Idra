import { wikiRuntime } from './wiki_runtime';

export function cancelWiki(): boolean {
	const controller = wikiRuntime.controller;
	if (!controller || controller.signal.aborted) return false;
	if (wikiRuntime.progress) {
		wikiRuntime.progress = { ...wikiRuntime.progress, phase: 'cancelling' };
	}
	controller.abort();
	return true;
}
