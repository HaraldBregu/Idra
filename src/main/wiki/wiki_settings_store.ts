import path from 'node:path';
import Store from 'electron-store';
import type { WikiSettings } from '../../shared/wiki_types';
import { wikiLocation } from './wiki_location';

export const DEFAULT_WIKI_SETTINGS: WikiSettings = {
	providerId: '',
	modelId: '',
	sourcePath: path.resolve(wikiLocation(), 'raw'),
	targetPath: path.resolve(wikiLocation(), 'data'),
	schedule: {
		enabled: false,
		cronExpression: '0 3 * * *',
	},
};

export const wikiSettingsStore = new Store<WikiSettings>({
	name: 'settings',
	cwd: wikiLocation(),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_WIKI_SETTINGS,
});
