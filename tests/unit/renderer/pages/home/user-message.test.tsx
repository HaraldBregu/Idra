import type React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMessage } from '../../../../../src/renderer/src/pages/home/components/UserMessage';

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));

jest.mock('@/components/ui/message', () => ({
	Message: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
		<div {...props}>{children}</div>
	),
	MessageContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
		<div data-testid="message-content" {...props}>{children}</div>
	),
}));

jest.mock('@/lib/utils', () => ({
	cn: (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' '),
}));

describe('UserMessage', () => {
	const longMessage = 'Long user message. '.repeat(40);

	it('does not collapse the current message', () => {
		render(<UserMessage content={longMessage} />);

		expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
		expect(screen.getByTestId('message-content')).not.toHaveClass('max-h-40');
	});

	it('collapses long previous messages and expands them on request', async () => {
		render(<UserMessage content={longMessage} collapseLongContent />);

		const button = screen.getByRole('button', { name: 'More' });
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('message-content')).toHaveClass('max-h-40');

		await userEvent.click(button);

		expect(screen.getByRole('button', { name: 'Less' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		expect(screen.getByTestId('message-content')).not.toHaveClass('max-h-40');
	});
});
