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
			React.createElement('div', {
				ref: (element: HTMLDivElement | null) =>
					element && onEditorReady?.({ view: { dom: element } }),
				role: 'textbox',
				children: value,
			}),
	};
});

describe('PromptEditor', () => {
	it('expands for multiline content and collapses when cleared', async () => {
		const { container, rerender } = render(
			<PromptEditor value="" leadingAction={<button>Attach</button>} actions={<button>Send</button>} />
		);
		const prompt = container.querySelector('[data-expanded]');

		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'false'));

		rerender(
			<PromptEditor
				value={'First line\nSecond line'}
				leadingAction={<button>Attach</button>}
				actions={<button>Send</button>}
			/>
		);
		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'true'));

		rerender(
			<PromptEditor value="" leadingAction={<button>Attach</button>} actions={<button>Send</button>} />
		);
		await waitFor(() => expect(prompt).toHaveAttribute('data-expanded', 'false'));
	});
});
