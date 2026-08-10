import { render, waitFor } from '@testing-library/react';
import { PromptEditor } from '@/components/prompt-editor';

jest.mock('@/components/text-editor', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		TextEditor: ({
			value,
			onEditorReady,
			onVisualLineChange,
			className,
		}: {
			value?: string;
			onEditorReady?: (editor: { view: { dom: HTMLDivElement } }) => void;
			onVisualLineChange?: (hasMultipleLines: boolean) => void;
			className?: string;
		}) =>
			React.createElement(
				'div',
				{ className },
				React.createElement(
					'div',
					{
						ref: (element: HTMLDivElement | null) => {
							if (!element) return;
							onEditorReady?.({ view: { dom: element } });
							onVisualLineChange?.(Boolean(value && value.length > 40));
						},
						role: 'textbox',
					},
					value
				)
			),
	};
});

describe('PromptEditor', () => {
	it('expands when text wraps to another visual line and collapses when cleared', async () => {
		const { container, rerender } = render(
			<PromptEditor
				value=""
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		const prompt = container.querySelector('[data-expanded]');

		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'false'));
		expect(prompt).toHaveClass('min-h-14');
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
		expect(prompt).toHaveClass('min-h-14');
		expect(prompt).toHaveClass('rounded-full');
		expect(prompt).toHaveStyle({ borderRadius: '9999px' });
	});
});
