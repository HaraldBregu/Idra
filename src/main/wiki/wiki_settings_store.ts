import path from 'node:path';
import Store from 'electron-store';
import type { WikiSettings } from '../../shared/wiki_types';
import { wikiLocation } from './wiki_location';

export const DEFAULT_WIKI_SETTINGS: WikiSettings = {
	enabled: true,
	providerId: '',
	modelId: '',
	sourcePath: path.resolve(wikiLocation(), 'raw'),
	targetPath: path.resolve(wikiLocation(), 'data'),
	autoFileAnswers: false,
	requireReviewForMajorChanges: true,
	retrievalPriority: 'wiki_first',
	lintOnStartup: false,
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
