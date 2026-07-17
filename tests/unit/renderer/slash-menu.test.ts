import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SlashMenu, slashMenuPluginKey } from '../../../src/renderer/src/components/slash-menu';

describe('SlashMenu', () => {
	it.each([
		['/', true],
		['/go', true],
		['/skill de', true],
		[' /', false],
		['hello /', false],
		['/goal ', false],
		['/skill demo ', false],
	])('sets active to %s only for an unfinished leading command', (content, active) => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, SlashMenu],
		});

		editor.commands.insertContent(content);

		expect(slashMenuPluginKey.getState(editor.state)?.active).toBe(active);
		editor.destroy();
	});

	it.each([
		[{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
		[{ type: 'paragraph' }],
	])('does not activate in a later paragraph', (firstParagraph) => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, SlashMenu],
			content: {
				type: 'doc',
				content: [firstParagraph, { type: 'paragraph' }],
			},
		});

		editor.chain().setTextSelection('end').insertContent('/').run();

		expect(slashMenuPluginKey.getState(editor.state)?.active).toBe(false);
		editor.destroy();
	});
});
