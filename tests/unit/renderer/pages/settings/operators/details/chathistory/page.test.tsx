import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AgentHistoryMessage } from '../../../../../../../../src/shared/service';
import ChatHistoryPage from '../../../../../../../../src/renderer/src/pages/settings/pages/operators/details/chathistory/Page';

const mockT = (key: string, params?: Record<string, unknown>): string => {
	if (!params) return key;
	return `${key}:${Object.entries(params)
		.map(([paramKey, value]) => `${paramKey}=${String(value)}`)
		.join(',')}`;
};

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: mockT,
	}),
}));

function renderChatHistoryPage(path = '/settings/operators/friday/details/chathistory'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path="/settings/operators/:operatorId/details/chathistory"
					element={<ChatHistoryPage />}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('ChatHistoryPage', () => {
	beforeEach(() => {
		window.agent = {
			send: jest.fn(async () => ''),
			reset: jest.fn(async () => undefined),
			cancel: jest.fn(async () => undefined),
			getHistory: jest.fn(async () => []),
			openHistoryFolder: jest.fn(async () => undefined),
			resolveApproval: jest.fn(async () => true),
			resolveInput: jest.fn(async () => true),
			getPending: jest.fn(async () => ({ approvals: [], inputs: [] })),
			listWorkspaceFiles: jest.fn(async () => []),
			readWorkspaceFile: jest.fn(),
			writeWorkspaceFile: jest.fn(),
			onResponse: jest.fn(() => jest.fn()),
			onPending: jest.fn(() => jest.fn()),
		};
	});

	it('loads chat history metrics for the stored transcript', async () => {
		(window.agent.getHistory as jest.Mock).mockResolvedValue([
			{ role: 'user', content: 'Hello Friday' },
			{
				role: 'assistant',
				content: 'Hi',
				contentBlocks: [{ type: 'text', text: 'Hi' }],
			},
			{ role: 'tool', toolUseId: 'tool-1', content: 'abc' },
		] satisfies AgentHistoryMessage[]);

		renderChatHistoryPage();

		expect(
			await screen.findByText('settings.chatHistory.messageCountValue:count=3')
		).toBeInTheDocument();
		expect(
			screen.getByText('settings.chatHistory.contextSizeValue:characters=17,tokens=5')
		).toBeInTheDocument();
		expect(
			screen.getByText('settings.chatHistory.breakdown:user=1,assistant=1,tool=1')
		).toBeInTheDocument();
	});

	it('resets the agent session when chat history deletion is confirmed', async () => {
		(window.agent.getHistory as jest.Mock).mockResolvedValue([
			{ role: 'user', content: 'Hello' },
		] satisfies AgentHistoryMessage[]);
		const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

		const user = userEvent.setup();
		renderChatHistoryPage();

		await screen.findByText('settings.chatHistory.messageCountValue:count=1');
		await user.click(screen.getByRole('button', { name: 'settings.chatHistory.delete' }));

		expect(confirm).toHaveBeenCalledWith('settings.chatHistory.confirmDelete');
		await waitFor(() => {
			expect(window.agent.reset).toHaveBeenCalled();
		});
		expect(
			screen.getByText('settings.chatHistory.messageCountValue:count=0')
		).toBeInTheDocument();
	});

	it('opens the chat history folder from the icon button', async () => {
		const user = userEvent.setup();
		renderChatHistoryPage();

		await user.click(await screen.findByRole('button', {
			name: 'settings.chatHistory.openFolder',
		}));

		await waitFor(() => {
			expect(window.agent.openHistoryFolder).toHaveBeenCalled();
		});
	});
});
