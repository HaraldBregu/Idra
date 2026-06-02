import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Model } from '../../../../../../src/shared/agents/service';
import type { PublicProvider } from '../../../../../../src/shared/providers';
import ModelServicePage from '../../../../../../src/renderer/src/pages/settings/pages/model-services/Page';

const openAiProvider: PublicProvider = {
	id: 'openai',
	name: 'OpenAI',
	baseUrl: 'https://api.openai.com/v1',
	capabilities: 'Chat',
};

const assistantModel: Model = {
	id: 'gpt-test',
	name: 'GPT Test',
};

const stableT = (key: string): string => key;

jest.mock('@/components/ui/select', () => {
	const Passthrough = ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>;

	return {
		Select: Passthrough,
		SelectContent: Passthrough,
		SelectItem: Passthrough,
		SelectTrigger: Passthrough,
		SelectValue: () => <span />,
	};
});

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: stableT,
	}),
}));

function installServiceApis(): void {
	window.store = {
		...window.store,
		getProviders: jest.fn(async () => [openAiProvider]),
		getAgentService: jest.fn(async () => ({ provider: openAiProvider, model: assistantModel })),
		saveAgentService: jest.fn(async () => true),
	} as typeof window.store;
	window.app = {
		...window.app,
		getModels: jest.fn(async () => [assistantModel]),
	} as typeof window.app;
	window.agent = {
		...window.agent,
		openHistoryFolder: jest.fn(async () => undefined),
	} as typeof window.agent;
}

function renderModelService(path = '/settings/model-services/assistant/details'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings/model-services/:serviceId/details" element={<ModelServicePage />} />
				<Route
					path="/settings/model-services/:serviceId/details/chathistory"
					element={<ModelServicePage />}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('ModelServicePage', () => {
	beforeEach(() => {
		installServiceApis();
	});

	it('renders the AI Assistant model service settings route', async () => {
		renderModelService();

		expect(await screen.findByText('settings.modelServices.assistantName')).toBeInTheDocument();
		expect(screen.getByText('OpenAI')).toBeInTheDocument();
		expect(screen.getAllByText('GPT Test').length).toBeGreaterThan(0);
		expect(window.store.getAgentService).toHaveBeenCalledTimes(1);
		expect(window.app.getModels).toHaveBeenCalledWith(openAiProvider);
	});

	it('renders the not-found state for unknown model services', () => {
		renderModelService('/settings/model-services/missing/details');

		expect(screen.getByText('settings.modelServices.notFoundTitle')).toBeInTheDocument();
	});

	it('saves the selected assistant provider and model through the store API', async () => {
		const user = userEvent.setup();
		renderModelService();

		const saveButton = await screen.findByRole('button', { name: /common\.save/ });
		await waitFor(() => {
			expect(saveButton).toBeEnabled();
		});
		await user.click(saveButton);

		await waitFor(() => {
			expect(window.store.saveAgentService).toHaveBeenCalledWith(openAiProvider, assistantModel);
		});
		expect(await screen.findByText('settings.modelServices.saved')).toBeInTheDocument();
	});
});
