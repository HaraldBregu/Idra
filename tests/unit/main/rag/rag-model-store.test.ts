const getAppModelSelections = jest.fn();
const setAppModelSelections = jest.fn();
const getRagConfiguration = jest.fn();
const saveRagConfiguration = jest.fn();

jest.mock('../../../../src/main/settings_store', () => ({
	getAppModelSelections,
	setAppModelSelections,
}));
jest.mock('../../../../src/main/providers/providers_index', () => ({
	getModelProvidersState: () => [],
	setModelProvidersState: jest.fn(),
}));
jest.mock('../../../../src/main/rag/rag_store', () => ({
	getRagConfiguration,
	saveRagConfiguration,
}));

import {
	getModelId,
	getProviderId,
	setModelId,
	setProviderId,
} from '../../../../src/main/models/models_store';

const appSelections = {
	text: { providerId: 'openai', modelId: 'gpt-5' },
	sound: { providerId: '', modelId: '' },
	image: { providerId: '', modelId: '' },
	video: { providerId: '', modelId: '' },
	voice: { providerId: '', modelId: '' },
	transcribe: { providerId: '', modelId: '' },
	realtime: { providerId: '', modelId: '' },
};

const ragConfiguration = {
	indexName: 'friday',
	databaseProviderId: 'pinecone',
	databaseId: 'pinecone',
	embeddingProviderId: 'openai',
	embeddingModelId: 'text-embedding-3-small',
	folders: [],
	scheduleEnabled: false,
	cronExpression: '0 3 * * *',
};

beforeEach(() => {
	jest.clearAllMocks();
	let currentRagConfiguration = { ...ragConfiguration };
	getAppModelSelections.mockReturnValue(appSelections);
	getRagConfiguration.mockImplementation(() => currentRagConfiguration);
	saveRagConfiguration.mockImplementation((configuration) => {
		currentRagConfiguration = configuration;
		return configuration;
	});
});

it('reads and writes embedding selection through the RAG store', () => {
	expect(getProviderId('embedding')).toBe('openai');
	expect(getModelId('embedding')).toBe('text-embedding-3-small');

	setProviderId('embedding', 'voyage');
	setModelId('embedding', 'voyage-3');

	expect(saveRagConfiguration).toHaveBeenNthCalledWith(1, {
		...ragConfiguration,
		embeddingProviderId: 'voyage',
	});
	expect(saveRagConfiguration).toHaveBeenNthCalledWith(2, {
		...ragConfiguration,
		embeddingProviderId: 'voyage',
		embeddingModelId: 'voyage-3',
	});
	expect(setAppModelSelections).not.toHaveBeenCalled();
});

it('keeps non-embedding selections in app settings', () => {
	setModelId('text', 'gpt-5.1');

	expect(setAppModelSelections).toHaveBeenCalledWith({
		...appSelections,
		text: { providerId: 'openai', modelId: 'gpt-5.1' },
	});
	expect(saveRagConfiguration).not.toHaveBeenCalled();
});
