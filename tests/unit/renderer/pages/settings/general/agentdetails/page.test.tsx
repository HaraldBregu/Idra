import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AgentDetailsPage from '../../../../../../../src/renderer/src/pages/settings/pages/general/agentdetails/Page';

const mockT = (key: string): string => key;

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: mockT,
	}),
}));

jest.mock('@/components/ui/select', () => {
	const Passthrough = ({ children }: { readonly children?: ReactNode }) => (
		<div>{children}</div>
	);

	return {
		Select: Passthrough,
		SelectContent: Passthrough,
		SelectItem: Passthrough,
		SelectTrigger: Passthrough,
		SelectValue: () => <span />,
	};
});

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderAgentDetailsPage(path = '/settings/general/agentdetails/main'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings/general/agentdetails/:agentId" element={<AgentDetailsPage />} />
				<Route
					path="/settings/general/agentdetails/:agentId/chathistory"
					element={<div>Chat history route</div>}
				/>
			</Routes>
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('AgentDetailsPage', () => {
	beforeEach(() => {
		const provider = {
			id: 'openai',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com/v1',
		};
		const model = { id: 'gpt-5', name: 'GPT-5' };
		window.app = {
			...window.app,
			getProviders: jest.fn(async () => [provider]),
			getAgentService: jest.fn(async () => ({ provider, model })),
			getSpeechTranscriberService: jest.fn(async () => undefined),
			getModels: jest.fn(async () => [model]),
			saveAgentService: jest.fn(async () => true),
			saveSpeechTranscriberService: jest.fn(async () => true),
		};
	});

	it('navigates from the Friday agent history row to chat history', async () => {
		const user = userEvent.setup();
		renderAgentDetailsPage();

		await user.click(await screen.findByRole('button', { name: /settings\.chatHistory\.title/ }));

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/settings/general/agentdetails/main/chathistory'
		);
	});

	it('renders the Friday page without identity or history description and collapses provider settings', async () => {
		const user = userEvent.setup();
		renderAgentDetailsPage();

		const providerCard = await screen.findByRole('button', {
			name: /settings\.agents\.provider/,
		});

		expect(screen.queryByText('settings.agents.identity')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.chatHistory.description')).not.toBeInTheDocument();
		expect(providerCard).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('settings.agents.providerDescription')).not.toBeInTheDocument();

		await user.click(providerCard);

		expect(providerCard).toHaveAttribute('aria-expanded', 'true');
		expect(await screen.findByText('settings.agents.providerDescription')).toBeInTheDocument();
	});
});
