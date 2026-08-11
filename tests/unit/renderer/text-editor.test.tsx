import { render, waitFor } from '@testing-library/react';
import { TextEditor } from '@/components/text-editor';

describe('TextEditor', () => {
	it('reports wrapped lines after a controlled value update', async () => {
		let selectedNode: Node | null = null;
		jest.spyOn(document, 'createRange').mockReturnValue({
			selectNodeContents: (node: Node) => {
				selectedNode = node;
			},
			getClientRects: () => {
				const lineCount = (selectedNode?.textContent?.length ?? 0) > 40 ? 2 : 1;
				return Array.from({ length: lineCount }, (_, index) => ({
					width: 100,
					height: 24,
					top: index * 24,
				})) as unknown as DOMRectList;
			},
		} as Range);

		const onVisualLineChange = jest.fn();
		const { rerender } = render(
			<TextEditor value="" onVisualLineChange={onVisualLineChange} />
		);

		await waitFor(() => expect(onVisualLineChange).toHaveBeenCalledWith(false));
		onVisualLineChange.mockClear();

		rerender(
			<TextEditor
				value={'A controlled transcript that wraps onto another visual line. '.repeat(3)}
				onVisualLineChange={onVisualLineChange}
			/>
		);

		await waitFor(() => expect(onVisualLineChange).toHaveBeenCalledWith(true));
	});
});
