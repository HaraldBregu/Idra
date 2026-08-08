import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RagPage from '../../../src/renderer/src/pages/settings/pages/rag/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.rag.title': 'Knowledge Base',
		'settings.rag.description': 'Configure retrieval-augmented generation.',
		'settings.rag.behaviorTitle': 'Knowledge Base behavior',
		'settings.rag.enabled': 'Enable Knowledge Base',
		'settings.rag.enabledDescription': 'Allow document indexing and assistant search.',
		'settings.rag.embeddingConsent': 'Send document text for embeddings',
		'settings.rag.embeddingConsentDescription':
			'Allow Friday to send document chunks to the selected embedding provider.',
		'settings.rag.embeddingModelTitle': 'Embedding model',
		'settings.rag.embeddingModelDescription':
			'Model used to embed RAG documents for vector search.',
		'settings.rag.configurationTitle': 'Configuration',
		'settings.rag.indexName': 'Index name',
		'settings.rag.indexNameDescription': 'Pinecone index.',
		'settings.rag.indexNamePlaceholder': 'friday',
		'settings.rag.documentsDescription': 'Documents to index.',
		'settings.rag.sourceFolder': 'Source folders',
		'settings.rag.sourcePlaceholder': 'Choose source folders',
		'settings.rag.pickFolder': 'Choose folder',
		'settings.rag.index': 'Generate index',
		'settings.rag.scheduleTitle': 'Automation',
		'settings.rag.scheduleFrequency': 'Indexing frequency',
		'settings.rag.scheduleDescription': 'Choose how often indexing runs.',
		'settings.rag.scheduleOptions.off': 'Off',
		'settings.rag.scheduleOptions.every4h': 'Every 4 hours',
		'settings.rag.scheduleOptions.every12h': 'Every 12 hours',
		'settings.rag.scheduleOptions.every1d': 'Every day',
		'settings.rag.scheduleOptions.every7d': 'Every week',
		'settings.rag.scheduleOptions.custom': 'Custom schedule',
		'settings.rag.searchTitle': 'Search',
		'settings.rag.searchPlaceholder': 'Search documents',
		'settings.rag.search': 'Search',
		'settings.vectorDb.defaultTitle': 'Vector database',
		'settings.vectorDb.databaseDescription': 'Database used for embeddings.',
		'settings.vectorDb.databasePlaceholder': 'Select a database',
		'settings.vectorDb.empty': 'No database provider is available.',
		'settings.modelServices.modelPlaceholder': 'Select model',
		'settings.modelServices.noModels': 'No models are available.',
	};
	const t = (key: string): string => translations[key] ?? key;
	return { useTranslation: () => ({ t }) };
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
	ragSaveConfiguration: jest.fn(),
};

const embeddingApi = {
	getProviderId: jest.fn(),
	getModelId: jest.fn(),
	setProviderId: jest.fn(),
	setModelId: jest.fn(),
};

beforeEach(() => {
	jest.clearAllMocks();
	Object.defineProperty(window, 'PointerEvent', {
		configurable: true,
		value: MouseEvent,
	});
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
		enabled: false,
		indexName: 'friday',
		databaseProviderId: '',
		databaseId: '',
		embeddingProviderId: 'openai',
		embeddingModelId: 'text-embedding-3-small',
		embeddingConsent: null,
		folders: [],
		scheduleEnabled: false,
		cronExpression: '0 3 * * *',
	});
	agentApi.ragSaveConfiguration.mockImplementation(async (configuration) => configuration);
	embeddingApi.getProviderId.mockResolvedValue('openai');
	embeddingApi.getModelId.mockResolvedValue('text-embedding-3-small');
	embeddingApi.setProviderId.mockResolvedValue(undefined);
	embeddingApi.setModelId.mockResolvedValue(undefined);
});

it('loads and saves the embedding model used by RAG', async () => {
	const user = userEvent.setup();
	render(<RagPage />);

	expect(await screen.findByRole('heading', { name: 'Knowledge Base' })).toBeInTheDocument();
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

it('enables the Knowledge Base from its settings page', async () => {
	const user = userEvent.setup();
	render(<RagPage />);

	const toggle = await screen.findByRole('switch', { name: 'Enable Knowledge Base' });
	expect(toggle).not.toBeChecked();
	await user.click(toggle);
	await waitFor(() =>
		expect(agentApi.ragSaveConfiguration).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: true })
		)
	);
});

it('records remote embedding consent for the selected provider and model', async () => {
	const user = userEvent.setup();
	render(<RagPage />);

	const consent = await screen.findByRole('switch', {
		name: 'Send document text for embeddings',
	});
	await user.click(consent);

	await waitFor(() =>
		expect(agentApi.ragSaveConfiguration).toHaveBeenCalledWith(
			expect.objectContaining({
				embeddingConsent: {
					providerId: 'openai',
					modelId: 'text-embedding-3-small',
				},
			})
		)
	);
});

it('groups providers, model, index, and folder paths in one configuration card', async () => {
	Object.defineProperty(window, 'app', {
		configurable: true,
		value: {
			databases: jest.fn().mockResolvedValue([
				{
					id: 'pinecone',
					name: 'Pinecone',
					provider: { id: 'pinecone', name: 'Pinecone' },
				},
			]),
		},
	});
	databaseApi.getConfiguration.mockResolvedValue({
		providerId: 'pinecone',
		databaseId: 'pinecone',
		providers: [],
	});
	agentApi.ragGetConfiguration.mockResolvedValue({
		indexName: 'friday',
		databaseProviderId: 'pinecone',
		databaseId: 'pinecone',
		embeddingProviderId: 'openai',
		embeddingModelId: 'text-embedding-3-small',
		folders: ['/Users/example/docs'],
		scheduleEnabled: false,
		cronExpression: '0 3 * * *',
	});

	render(<RagPage />);

	await screen.findByRole('combobox', { name: 'Vector database' });
	await screen.findByText('/Users/example/docs');
	const configurationTitle = await screen.findByText('Configuration');
	const configurationCard = configurationTitle
		.closest('section')
		?.querySelector<HTMLElement>('[data-slot="card"]');
	expect(configurationCard).toBeInTheDocument();

	const configuration = within(configurationCard as HTMLElement);
	expect(configuration.getByRole('combobox', { name: 'Vector database' })).toBeInTheDocument();
	expect(configuration.getByRole('combobox', { name: 'Embedding model' })).toBeInTheDocument();
	expect(configuration.getByLabelText('Index name')).toHaveValue('friday');
	expect(configuration.getByText('/Users/example/docs')).toBeInTheDocument();
	expect(configuration.getByRole('button', { name: 'Choose folder' })).toBeInTheDocument();
	expect(screen.getAllByText('Configuration')).toHaveLength(1);
});

it('saves the selected RAG index name from the configuration card', async () => {
	const user = userEvent.setup();
	render(<RagPage />);

	expect(await screen.findByText('Configuration')).toBeInTheDocument();
	const indexName = screen.getByLabelText('Index name');
	await waitFor(() => expect(indexName).toHaveValue('friday'));
	await user.clear(indexName);
	await user.type(indexName, 'knowledge-base');
	expect(indexName).toHaveValue('knowledge-base');
	await user.tab();

	await waitFor(() =>
		expect(agentApi.ragSaveConfiguration).toHaveBeenCalledWith(
			expect.objectContaining({ indexName: 'knowledge-base' })
		)
	);
});

it('saves a friendly automation schedule preset', async () => {
	const user = userEvent.setup();
	agentApi.ragGetConfiguration.mockResolvedValue({
		indexName: 'friday',
		databaseProviderId: '',
		databaseId: '',
		embeddingProviderId: 'openai',
		embeddingModelId: 'text-embedding-3-small',
		folders: [],
		scheduleEnabled: true,
		cronExpression: '0 */12 * * *',
	});

	render(<RagPage />);

	expect(await screen.findByRole('heading', { name: 'Automation' })).toBeInTheDocument();
	const frequency = screen.getByRole('combobox', { name: 'Indexing frequency' });
	await waitFor(() => expect(frequency).toHaveTextContent('Every 12 hours'));

	await user.click(frequency);
	await user.click(await screen.findByRole('option', { name: 'Every 4 hours' }));

	await waitFor(() =>
		expect(agentApi.ragSaveConfiguration).toHaveBeenCalledWith(
			expect.objectContaining({
				scheduleEnabled: true,
				cronExpression: '0 */4 * * *',
			})
		)
	);
});
