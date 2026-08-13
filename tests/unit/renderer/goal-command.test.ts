import { Editor } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { GoalCommand } from '../../../src/renderer/src/components/goal-command';

function typeText(editor: Editor, text: string): void {
	for (const character of text) {
		const position = editor.state.selection.to;
		const handled = editor.view.someProp('handleTextInput', (handler) =>
			handler(editor.view, position, position, character)
		);
		if (!handled) editor.commands.insertContent(character);
	}
}

describe('GoalCommand', () => {
	it('turns a leading /goal into a green inline node and preserves the command on submit', () => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, GoalCommand, Markdown],
		});

		typeText(editor, '/goal');
		expect(editor.getHTML()).toContain('data-goal-command');
		expect(editor.getHTML()).toContain('text-emerald-600');

		typeText(editor, 'Keep tests green');
		expect(editor.getMarkdown()).toBe('/goal Keep tests green');
		editor.destroy();
	});

	it('leaves /goal as text outside the beginning and supports boundary deletion', () => {
		const editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, GoalCommand],
		});
		typeText(editor, 'Start /goal');
		expect(editor.getHTML()).not.toContain('data-goal-command');

		editor.commands.clearContent();
		typeText(editor, '/goal');
		editor.commands.keyboardShortcut('Backspace');
		expect(editor.getHTML()).not.toContain('data-goal-command');
		editor.destroy();
	});
});
