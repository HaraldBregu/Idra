import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RagPage from '../../../src/renderer/src/pages/settings/pages/rag/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.tabs.rag': 'RAG',
		'settings.rag.description': 'Configure retrieval-augmented generation.',
		'settings.rag.embeddingModelTitle': 'Embedding model',
		'settings.rag.embeddingModelDescription':
			'Model used to embed RAG documents for vector search.',
		'settings.rag.documentsTitle': 'Documents',
		'settings.rag.documentsDescription': 'Documents to index.',
		'settings.rag.sourcePlaceholder': 'Choose source folders',
		'settings.rag.pickFolder': 'Choose folder',
		'settings.rag.index': 'Generate index',
		'settings.rag.scheduleTitle': 'Automatic indexing',
		'settings.rag.scheduleEnabled': 'Run on a schedule',
		'settings.rag.scheduleDescription': 'Index automatically.',
		'settings.rag.cronPlaceholder': '0 3 * * *',
		'settings.rag.cronExpression': 'Cron expression',
		'settings.rag.searchTitle': 'Search',
		'settings.rag.searchPlaceholder': 'Search documents',
		'settings.rag.search': 'Search',
		'settings.vectorDb.defaultTitle': 'Vector database',
		'settings.vectorDb.empty': 'No database provider is available.',
		'settings.modelServices.modelPlaceholder': 'Select model',
		'settings.modelServices.noModels': 'No models are available.',
	};
	return { useTranslation: () => ({ t: (key: string) => translations[key] ?? key }) };
});

jest.mock('@/lib/providers', () => ({
	defaultProviderId: () => 'openai',
	modelsFor: () => [
		{
			id: 'text-embedding-3-small',
			name: 'Text Embedding 3 Small',
			type: 'embedding',
			provider: { id: 'openai', name: 'OpenAI' },
		},
		{
			id: 'voyage-3',
			name: 'Voyage 3',
			type: 'embedding',
			provider: { id: 'voyage', name: 'Voyage' },
		},
	],
}));

const databaseApi = {
	getConfiguration: jest.fn(),
	saveConfiguration: jest.fn(),
};

const agentApi = {
	ragGetConfiguration: jest.fn(),
};

const embeddingApi = {
	getProviderId: jest.fn(),
	getModelId: jest.fn(),
	setProviderId: jest.fn(),
	setModelId: jest.fn(),
};

beforeEach(() => {
	Object.defineProperty(window, 'app', {
		configurable: true,
		value: { databases: jest.fn().mockResolvedValue([]) },
	});
	Object.defineProperty(window, 'database', { configurable: true, value: databaseApi });
	Object.defineProperty(window, 'agent', { configurable: true, value: agentApi });
	Object.defineProperty(window, 'models', {
		configurable: true,
		value: { embedding: embeddingApi },
	});
	databaseApi.getConfiguration.mockResolvedValue({
		providerId: undefined,
		databaseId: undefined,
		providers: [],
	});
	agentApi.ragGetConfiguration.mockResolvedValue({
		folders: [],
		scheduleEnabled: false,
		cronExpression: '0 3 * * *',
	});
	embeddingApi.getProviderId.mockResolvedValue('openai');
	embeddingApi.getModelId.mockResolvedValue('text-embedding-3-small');
	embeddingApi.setProviderId.mockResolvedValue(undefined);
	embeddingApi.setModelId.mockResolvedValue(undefined);
});

it('loads and saves the embedding model used by RAG', async () => {
	const user = userEvent.setup();
	render(<RagPage />);

	const selector = await screen.findByRole('combobox', { name: 'Embedding model' });
	expect(selector).toHaveTextContent('OpenAI / Text Embedding 3 Small');

	selector.focus();
	await user.keyboard('{ArrowDown}');
	await user.click(await screen.findByRole('option', { name: 'Voyage / Voyage 3' }));

	await waitFor(() => {
		expect(embeddingApi.setProviderId).toHaveBeenCalledWith('voyage');
		expect(embeddingApi.setModelId).toHaveBeenCalledWith('voyage-3');
	});
});
