import { render, screen } from '@testing-library/react';
import { UserMessage } from '../../../src/renderer/src/pages/home/components/UserMessage';

jest.mock('@/components/prompt-kit/markdown', () => ({
	Markdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

it('does not render a user bubble before a voice transcript is available', () => {
	const { container, rerender } = render(<UserMessage content="" />);
	expect(container).toBeEmptyDOMElement();

	rerender(<UserMessage content="Show the message I sent." />);
	expect(screen.getByText('Show the message I sent.')).toBeInTheDocument();
});
