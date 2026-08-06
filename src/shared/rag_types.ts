export const DEFAULT_RAG_INDEX_NAME = 'friday';

export interface RagConfiguration {
	indexName: string;
	folders: string[];
	scheduleEnabled: boolean;
	cronExpression: string;
}
