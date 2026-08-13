import { Editor } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { PlanCommand } from '../../../src/renderer/src/components/plan-command';

function typeText(editor: Editor, text: string): void {
	for (const character of text) {
		const position = editor.state.selection.to;
		editor.view.someProp('handleTextInput', (handler) =>
			handler(editor.view, position, position, character)
		);
	}
}

describe('PlanCommand', () => {
	it('turns a leading /plan into a purple inline node excluded from the prompt', () => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, PlanCommand, Markdown],
		});

		typeText(editor, '/plan');

		expect(editor.getHTML()).toContain('data-plan-command');
		expect(editor.getHTML()).toContain('text-purple-700');
		expect(editor.getMarkdown().trim()).toBe('');

		typeText(editor, 'Inspect the current architecture');
		expect(editor.getMarkdown().trim()).toBe('Inspect the current architecture');
		editor.destroy();
	});

	it('leaves /plan as text when it is not at the beginning', () => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, PlanCommand, Markdown],
		});

		typeText(editor, 'Start /plan');

		expect(editor.getHTML()).not.toContain('data-plan-command');
		expect(editor.getMarkdown()).toBe('Start /plan');
		editor.destroy();
	});
});
