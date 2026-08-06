const getAppModelSelections = jest.fn();
const setAppModelSelections = jest.fn();
const getAgentProviderId = jest.fn();
const setAgentProviderId = jest.fn();
const getAgentModelId = jest.fn();
const setAgentModelId = jest.fn();
const getRagConfiguration = jest.fn();
const saveRagConfiguration = jest.fn();

jest.mock('../../../../src/main/settings_store', () => ({
	getAppModelSelections,
	setAppModelSelections,
}));
jest.mock('../../../../src/main/agent/agent_store', () => ({
	getProviderId: getAgentProviderId,
	setProviderId: setAgentProviderId,
	getModelId: getAgentModelId,
	setModelId: setAgentModelId,
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
	getAgentProviderId.mockReturnValue('openai');
	getAgentModelId.mockReturnValue('gpt-5');
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

it('reads and writes text selection through the agent store', () => {
	expect(getProviderId('text')).toBe('openai');
	expect(getModelId('text')).toBe('gpt-5');

	setModelId('text', 'gpt-5.1');

	expect(setAgentModelId).toHaveBeenCalledWith('gpt-5.1');
	expect(setAppModelSelections).not.toHaveBeenCalled();
	expect(saveRagConfiguration).not.toHaveBeenCalled();
});
