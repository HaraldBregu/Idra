import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import type {
	PluginInstallResult,
	PluginInstallSkipped,
	PluginSummary,
} from '../../shared/plugin_types';
import { pluginManifestSchema } from './schema';
import { pluginSummary } from './summary';
import type { PluginRepository } from './repository';

export async function installPlugins(
	repository: PluginRepository
): Promise<PluginInstallResult | undefined> {
	const options: Electron.OpenDialogOptions = {
		title: 'Select plugin folder(s) to install',
		properties: ['openDirectory', 'multiSelections'],
	};
	const window = BrowserWindow.getFocusedWindow();
	const result = await (window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options));
	if (result.canceled || result.filePaths.length === 0) return undefined;

	repository.ensure();
	const installed: PluginSummary[] = [];
	const skipped: PluginInstallSkipped[] = [];

	for (const source of result.filePaths) {
		const name = path.basename(source);
		let rawManifest: unknown;
		try {
			rawManifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
		} catch (error) {
			skipped.push({
				name,
				reason: error instanceof Error ? error.message : 'Could not read the plugin manifest.',
			});
			continue;
		}
		const parsed = pluginManifestSchema.safeParse(rawManifest);
		if (!parsed.success) {
			skipped.push({
				name,
				reason: parsed.error.issues.map((issue) => issue.message).join(' '),
			});
			continue;
		}

		const destination = path.join(repository.root, parsed.data.id);
		fs.rmSync(destination, { recursive: true, force: true });
		fs.cpSync(source, destination, { recursive: true });

		const issue = repository.scan().issues.find((item) => item.pluginId === parsed.data.id);
		if (issue) {
			fs.rmSync(destination, { recursive: true, force: true });
			skipped.push({ name, reason: issue.message });
			continue;
		}
		installed.push(pluginSummary({ directory: destination, manifest: parsed.data }));
	}

	return { installed, skipped };
}
