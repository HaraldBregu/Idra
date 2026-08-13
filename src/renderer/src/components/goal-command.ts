import { InputRule, Node } from '@tiptap/core';

export const GoalCommand = Node.create({
	name: 'goalCommand',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: false,
	parseHTML: () => [{ tag: 'span[data-goal-command]' }],
	renderHTML: () => [
		'span',
		{
			'data-goal-command': '',
			class: 'font-semibold text-emerald-600 dark:text-emerald-400',
			contenteditable: 'false',
		},
		'Goal',
	],
	renderText: () => '/goal',
	renderMarkdown: () => '/goal',
	addInputRules() {
		const type = this.type;
		return [
			new InputRule({
				find: /^\/goal$/,
				handler: ({ state, range }) => {
					if (range.from !== 1) return null;
					state.tr.replaceWith(range.from, range.to, [type.create(), state.schema.text(' ')]);
					return undefined;
				},
			}),
		];
	},
	addKeyboardShortcuts() {
		return {
			Backspace: () => {
				const { doc, selection } = this.editor.state;
				if (!selection.empty) return false;
				let position: number | undefined;
				doc.descendants((node, nodePosition) => {
					if (node.type === this.type) position = nodePosition;
					return position === undefined;
				});
				if (position === undefined || selection.from <= position) return false;
				if (doc.textBetween(position + 1, selection.from).trim().length > 0) return false;
				return this.editor.commands.command(({ tr }) => {
					tr.delete(position!, selection.from);
					return true;
				});
			},
		};
	},
});
