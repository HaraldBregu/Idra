import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import OperatorDetailsPage from '../../../../../../../src/renderer/src/pages/settings/pages/operators/details/Page';

const mockT = (key: string): string => key;

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: mockT,
	}),
}));

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

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderOperatorDetailsPage(path = '/settings/operators/friday/details'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings/operators/:operatorId/details" element={<OperatorDetailsPage />} />
				<Route
					path="/settings/operators/:operatorId/details/chathistory"
					element={<div>Chat history route</div>}
				/>
				<Route path="/settings/cron" element={<div>Cron settings route</div>} />
				<Route path="/settings/task-manager" element={<div>Task Manager settings route</div>} />
			</Routes>
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('OperatorDetailsPage', () => {
	beforeEach(() => {
		const provider = {
			id: 'openai',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com/v1',
		};
		const model = { id: 'gpt-5', name: 'GPT-5' };
		const assistantOperator = {
			id: 'friday',
			name: 'Assistant',
			docsPath: 'agent.md',
			status: 'implemented' as const,
			provider,
			model,
		};
		window.app = {
			...window.app,
			getProviders: jest.fn(async () => [provider]),
			getAssistantOperator: jest.fn(async () => assistantOperator),
			getSpeechToTextOperator: jest.fn(async () => undefined),
			getModels: jest.fn(async () => [model]),
			saveAssistantOperator: jest.fn(async () => true),
			saveSpeechToTextOperator: jest.fn(async () => true),
		};
	});

	it('navigates from the Friday operator history row to chat history', async () => {
		const user = userEvent.setup();
		renderOperatorDetailsPage();

		await user.click(await screen.findByRole('button', { name: /settings\.chatHistory\.title/ }));

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/settings/operators/friday/details/chathistory'
		);
	});

	it('renders the Friday page without identity or history description and collapses provider settings', async () => {
		const user = userEvent.setup();
		renderOperatorDetailsPage();

		const providerCard = await screen.findByRole('button', {
			name: /settings\.operators\.provider/,
		});

		expect(screen.queryByText('settings.operators.identity')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.chatHistory.description')).not.toBeInTheDocument();
		expect(providerCard).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('settings.operators.providerDescription')).not.toBeInTheDocument();

		await user.click(providerCard);

		expect(providerCard).toHaveAttribute('aria-expanded', 'true');
		expect(await screen.findByText('settings.operators.providerDescription')).toBeInTheDocument();
	});

	it('renders placeholder settings for the document reader operator', async () => {
		renderOperatorDetailsPage('/settings/operators/document-reader/details');

		expect(await screen.findByText('settings.operators.documentReaderName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.configurationPending')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.documentReaderProviderDescription')).toBeInTheDocument();
		expect(screen.getByText('OCR provider')).toBeInTheDocument();
	});

	it('renders Cron Task configuration details', async () => {
		const user = userEvent.setup();
		renderOperatorDetailsPage('/settings/operators/cron-task-scheduler/details');

		expect(await screen.findByText('settings.operators.cronTaskName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.cronTaskRuntimeValue')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.cronTaskScopeValue')).toBeInTheDocument();

		await user.click(screen.getByRole('button', {
			name: 'settings.operators.openCronTaskConfiguration',
		}));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/cron');
	});

	it('renders Background Task configuration details', async () => {
		const user = userEvent.setup();
		renderOperatorDetailsPage('/settings/operators/background-task/details');

		expect(await screen.findByText('settings.operators.backgroundTaskName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.backgroundTaskRuntimeValue')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.backgroundTaskTypesValue')).toBeInTheDocument();

		await user.click(screen.getByRole('button', {
			name: 'settings.operators.openBackgroundTaskConfiguration',
		}));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/task-manager');
	});
});
