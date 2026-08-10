import { render, waitFor } from '@testing-library/react';
import { PromptEditor } from '@/components/prompt-editor';

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
