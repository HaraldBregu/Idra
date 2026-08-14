import path from 'node:path';
import Store from 'electron-store';
import cron from 'node-cron';
import { DEFAULT_RAG_INDEX_NAME, type RagConfiguration } from '../../../shared/rag_types';
import { userDataLocation } from '../../../shared/user_data_location';
import { normalizeRagIndexName } from './rag_index_name';

const DEFAULT_RAG_CONFIGURATION: RagConfiguration = {
	enabled: false,
	indexName: DEFAULT_RAG_INDEX_NAME,
	databaseProviderId: '',
	databaseId: '',
	embeddingProviderId: '',
	embeddingModelId: '',
	embeddingConsent: null,
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

export const ragConfigurationStorePath = store.path;

export function getRagConfiguration(): RagConfiguration {
	return { ...DEFAULT_RAG_CONFIGURATION, ...store.store, folders: [...store.get('folders')] };
}

export function saveRagConfiguration(configuration: RagConfiguration): RagConfiguration {
	const indexName = normalizeRagIndexName(configuration.indexName);
	const folders = [
		...new Set(configuration.folders.map((folder) => folder.trim()).filter(Boolean)),
	];
	const cronExpression = configuration.cronExpression.trim().replace(/\s+/g, ' ');
	if (configuration.scheduleEnabled && !cron.validate(cronExpression)) {
		throw new Error('RAG indexing schedule must be a valid cron expression.');
	}
	const saved = {
		enabled: configuration.enabled === true,
		indexName,
		databaseProviderId: configuration.databaseProviderId?.trim() ?? '',
		databaseId: configuration.databaseId?.trim() ?? '',
		embeddingProviderId: configuration.embeddingProviderId?.trim() ?? '',
		embeddingModelId: configuration.embeddingModelId?.trim() ?? '',
		embeddingConsent:
			configuration.embeddingConsent?.providerId.trim() &&
			configuration.embeddingConsent.modelId.trim()
				? {
						providerId: configuration.embeddingConsent.providerId.trim(),
						modelId: configuration.embeddingConsent.modelId.trim(),
					}
				: null,
		folders,
		scheduleEnabled: configuration.scheduleEnabled,
		cronExpression: cronExpression || DEFAULT_RAG_CONFIGURATION.cronExpression,
	};
	store.store = saved;
	return saved;
}
