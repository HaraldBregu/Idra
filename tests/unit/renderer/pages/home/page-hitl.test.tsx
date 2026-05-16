import type React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HomeMultiSelectMessage, ImmediateApprovalSelection } from '../../../../../src/renderer/src/pages/home/context';

const mockSubmitMultiSelect = jest.fn();
const mockUseHomeAgent = jest.fn();
const mockSetMode = jest.fn();

jest.mock('motion/react', () => ({
	AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
	motion: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
		span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
			<span {...props}>{children}</span>
		),
	},
}));

jest.mock('lucide-react', () => ({
	ArrowUp: () => <span data-testid="arrow-up" />,
	AudioLines: () => <span data-testid="audio-lines" />,
	Mic: () => <span data-testid="mic" />,
	Plus: () => <span data-testid="plus" />,
	RotateCcw: () => <span data-testid="rotate" />,
	Square: () => <span data-testid="square" />,
}));

jest.mock('@/components/app/base/page', () => ({
	PageContainer: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
		<div {...props}>{children}</div>
	),
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));

jest.mock('@/components/ui/chat-container', () => ({
	ChatContainerContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	ChatContainerRoot: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	ChatContainerScrollAnchor: () => <div />,
}));

jest.mock('@/components/ui/prompt-input', () => ({
	PromptInput: ({
		children,
		actions,
	}: React.PropsWithChildren<{ actions?: React.ReactNode }>) => (
		<div>
			{children}
			{actions}
		</div>
	),
	PromptInputAction: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
	PromptInputActions: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	PromptInputTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
		<textarea {...props} />
	),
}));

jest.mock('@/components/ui/scroll-button', () => ({
	ScrollButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));

jest.mock('@/contexts/chat-mode', () => ({
	useChatMode: () => ({ setMode: mockSetMode }),
}));

jest.mock('@/lib/utils', () => ({
	cn: (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' '),
}));

jest.mock('../../../../../src/renderer/src/pages/home/components/AgentTextMessage', () => ({
	AgentTextMessage: () => <div data-testid="agent-message" />,
}));

jest.mock('../../../../../src/renderer/src/pages/home/components/ReferenceConversation', () => ({
	ReferenceConversation: () => <div data-testid="reference-conversation" />,
}));

jest.mock('../../../../../src/renderer/src/pages/home/components/UserMessage', () => ({
	UserMessage: ({ content }: { content: string }) => <div>{content}</div>,
}));

jest.mock('../../../../../src/renderer/src/pages/home/components/PendingMessage', () => ({
	PendingMessage: ({
		message,
		onSubmit,
	}: {
		message: HomeMultiSelectMessage;
		onSubmit: (
			message: HomeMultiSelectMessage,
			immediateApproval?: ImmediateApprovalSelection
		) => void;
	}) => (
		<button
			type="button"
			onClick={() =>
				onSubmit(message, {
					approvalId: 'approval-1',
					decision: 'allow-once',
					optionId: 'approval:approval-1:allow-once',
				})
			}
		>
			Approve once
		</button>
	),
}));

jest.mock('../../../../../src/renderer/src/pages/home/hooks', () => ({
	useHomeAgent: mockUseHomeAgent,
}));

import Page from '../../../../../src/renderer/src/pages/home/Page';

const pendingMessage: HomeMultiSelectMessage = {
	id: 'pending-1',
	role: 'agent',
	type: 'multi-select',
	prompt: 'Confirm action',
	options: [
		{
			id: 'approval:approval-1:allow-once',
			kind: 'approval',
			label: 'exec: Allow once',
			description: 'run command',
			approvalId: 'approval-1',
			decision: 'allow-once',
		},
		{
			id: 'approval:approval-1:deny',
			kind: 'approval',
			label: 'exec: Deny',
			description: 'run command',
			approvalId: 'approval-1',
			decision: 'deny',
		},
	],
};

describe('home page HITL wiring', () => {
	beforeEach(() => {
		mockSubmitMultiSelect.mockReset();
		mockUseHomeAgent.mockReset();
		mockSetMode.mockReset();
		mockUseHomeAgent.mockReturnValue({
			chatState: {
				messages: [
					{ id: 'user-1', role: 'user', type: 'user', content: 'run it' },
					pendingMessage,
				],
			},
			handleSubmit: jest.fn(),
			historyLoading: false,
			input: '',
			inputRef: { current: null },
			isLoading: false,
			pendingInputAnswers: {},
			resetChat: jest.fn(),
			selectedOptions: { 'pending-1': ['approval:approval-1:deny'] },
			selectApprovalOption: jest.fn(),
			setInput: jest.fn(),
			submitMultiSelect: mockSubmitMultiSelect,
			switchToTyping: jest.fn(),
			updatePendingInputAnswer: jest.fn(),
			useSuggestion: jest.fn(),
		});
	});

	it('forwards immediate approval decisions from the pending message', async () => {
		render(<Page />);

		await userEvent.click(screen.getByRole('button', { name: 'Approve once' }));

		expect(mockSubmitMultiSelect).toHaveBeenCalledWith(pendingMessage, {
			approvalId: 'approval-1',
			decision: 'allow-once',
			optionId: 'approval:approval-1:allow-once',
		});
	});
});
