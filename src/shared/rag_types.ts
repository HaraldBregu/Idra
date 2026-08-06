export const DEFAULT_RAG_INDEX_NAME = 'friday';

export interface RagConfiguration {
	indexName: string;
	databaseProviderId: string;
	databaseId: string;
	embeddingProviderId: string;
	embeddingModelId: string;
	folders: string[];
	scheduleEnabled: boolean;
	cronExpression: string;
}
