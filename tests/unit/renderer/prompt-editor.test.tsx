import { render, waitFor } from '@testing-library/react';
import { PromptEditor } from '@/components/prompt-editor';

jest.mock('@/components/text-editor', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		TextEditor: ({
			value,
			onEditorReady,
		}: {
			value?: string;
			onEditorReady?: (editor: { view: { dom: HTMLDivElement } }) => void;
		}) =>
			React.createElement(
				'div',
				{
					ref: (element: HTMLDivElement | null) => {
						if (!element) return;
						Object.defineProperty(element, 'scrollHeight', {
							configurable: true,
							value: value && value.length > 40 ? 48 : 28,
						});
						onEditorReady?.({ view: { dom: element } });
					},
					role: 'textbox',
				},
				value
			),
	};
});

describe('PromptEditor', () => {
	it('expands for overflowing content and collapses when cleared', async () => {
		const { container, rerender } = render(
			<PromptEditor
				value=""
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		const prompt = container.querySelector('[data-expanded]');

		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'false'));
		expect(prompt).toHaveClass('min-h-10');
		expect(prompt).toHaveClass('rounded-full');
		expect(prompt).toHaveStyle({ borderRadius: '9999px' });

		rerender(
			<PromptEditor
				value={'A long prompt that needs more vertical space. '.repeat(3)}
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'true'));
		expect(prompt).toHaveClass('min-h-24');
		expect(prompt).toHaveClass('rounded-xl');
		expect(prompt).toHaveStyle({ borderRadius: '12px' });

		rerender(
			<PromptEditor
				value=""
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'false'));
		expect(prompt).toHaveClass('min-h-10');
		expect(prompt).toHaveClass('rounded-full');
		expect(prompt).toHaveStyle({ borderRadius: '9999px' });
	});
});
