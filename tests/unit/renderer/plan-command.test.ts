import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { PlanCommand } from '../../../src/renderer/src/components/plan-command';

function typeText(editor: Editor, text: string): void {
	for (const character of text) {
		const position = editor.state.selection.to;
		const handled = editor.view.someProp('handleTextInput', (handler) =>
			handler(editor.view, position, position, character)
		);
		if (!handled) editor.commands.insertContent(character);
	}
}

describe('PlanCommand', () => {
	it('turns a leading /plan into a purple inline node excluded from the prompt', () => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, PlanCommand],
		});

		typeText(editor, '/plan');

		const html = editor.getHTML();
		expect(html).toContain('data-plan-command');
		expect(html).toContain('text-purple-600');
		expect(html).not.toContain('border-purple');
		expect(html).not.toContain('bg-purple');
		expect(editor.state.doc.textContent.trim()).toBe('');

		typeText(editor, 'Inspect the current architecture');
		expect(editor.state.doc.textContent.trim()).toBe('Inspect the current architecture');
		editor.destroy();
	});

	it('leaves /plan as text when it is not at the beginning', () => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, PlanCommand],
		});

		typeText(editor, 'Start /plan');

		expect(editor.getHTML()).not.toContain('data-plan-command');
		expect(editor.state.doc.textContent).toBe('Start /plan');
		editor.destroy();
	});

	it('removes the Plan node with Backspace at its boundary', () => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, PlanCommand],
		});
		typeText(editor, '/plan');
		expect(editor.getHTML()).toContain('data-plan-command');

		editor.commands.keyboardShortcut('Backspace');

		expect(editor.getHTML()).not.toContain('data-plan-command');
		editor.destroy();
	});
});
