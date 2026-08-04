import path from 'node:path';
import Store from 'electron-store';
import type { RagConfiguration } from '../../shared/rag_types';
import { userDataLocation } from '../shared/user_data_location';

const DEFAULT_RAG_CONFIGURATION: RagConfiguration = {
	folders: [],
	scheduleEnabled: false,
	cronExpression: '0 3 * * *',
};

const store = new Store<RagConfiguration>({
	name: 'rag',
	cwd: path.resolve(userDataLocation(), 'settings'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_RAG_CONFIGURATION,
});

export function getRagConfiguration(): RagConfiguration {
	return { ...DEFAULT_RAG_CONFIGURATION, ...store.store, folders: [...store.get('folders')] };
}

export function saveRagConfiguration(configuration: RagConfiguration): RagConfiguration {
	const folders = [
		...new Set(configuration.folders.map((folder) => folder.trim()).filter(Boolean)),
	];
	const cronExpression = configuration.cronExpression.trim().replace(/\s+/g, ' ');
	const saved = {
		folders,
		scheduleEnabled: configuration.scheduleEnabled,
		cronExpression: cronExpression || DEFAULT_RAG_CONFIGURATION.cronExpression,
	};
	store.store = saved;
	return saved;
}
