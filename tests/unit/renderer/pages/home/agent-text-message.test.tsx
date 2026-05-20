import type React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentTextMessage } from '../../../../../src/renderer/src/pages/home/components/AgentTextMessage';
import type { AgentMessage } from '../../../../../src/renderer/src/pages/home/context';

jest.mock('@/components/prompt-kit/markdown', () => ({
	Markdown: ({
		children,
		className,
	}: React.PropsWithChildren<{ className?: string }>) => (
		<div data-testid="markdown" className={className}>
			{children}
		</div>
	),
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));

jest.mock('@/components/ui/message', () => ({
	Message: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
		<div {...props}>{children}</div>
	),
}));

jest.mock('@/lib/utils', () => ({
	cn: (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' '),
}));

function agentMessage(content: string): AgentMessage {
	return {
		id: 'agent-1',
		role: 'agent',
		type: 'agent',
		content,
		state: 'completed',
		tools: [],
	};
}

describe('AgentTextMessage', () => {
	const longMessage = 'Long assistant message. '.repeat(40);

	it('does not collapse the current message', () => {
		render(<AgentTextMessage message={agentMessage(longMessage)} showHeader={false} />);

		expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
		expect(screen.getByTestId('markdown')).not.toHaveClass('max-h-48');
	});

	it('collapses long previous messages and expands them on request', async () => {
		render(
			<AgentTextMessage
				message={agentMessage(longMessage)}
				showHeader={false}
				collapseLongContent
			/>
		);

		const button = screen.getByRole('button', { name: 'More' });
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('markdown')).toHaveClass('max-h-48');

		await userEvent.click(button);

		expect(screen.getByRole('button', { name: 'Less' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		expect(screen.getByTestId('markdown')).not.toHaveClass('max-h-48');
	});
});
