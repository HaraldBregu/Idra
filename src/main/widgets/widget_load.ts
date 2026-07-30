import { existsSync } from 'node:fs';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../app/window_factory';
import { extensionEntryPath } from './extension_entry';
import { render } from './extension_render';
import type { Extension } from './extension_types';
import type { PluginRepository } from '../plugin';

export function loadExtension(
	windowFactory: WindowFactory,
	extension: Extension,
	appLocation?: string,
	pluginRepository?: PluginRepository
): BrowserWindow {
	const entry = extension.source
		? pluginRepository?.resolveExtensionEntry(extension.source)
		: extensionEntryPath(extension.id, extension.metadata.entry, appLocation);
	if (!entry) throw new Error(`Plugin repository is required to load extension: ${extension.id}`);
	if (!existsSync(entry)) throw new Error(`Extension entry not found: ${extension.id}`);
	return render(windowFactory, entry, extension.title, Boolean(extension.source));
}
