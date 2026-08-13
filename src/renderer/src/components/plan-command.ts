import { InputRule, Node } from '@tiptap/core';

export const PlanCommand = Node.create({
	name: 'planCommand',
	group: 'inline',
	inline: true,
	atom: true,
	selectable: false,
	parseHTML: () => [{ tag: 'span[data-plan-command]' }],
	renderHTML: () => [
		'span',
		{
			'data-plan-command': '',
			class:
				'inline-flex items-center rounded-md border border-purple-500/30 bg-purple-500/15 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300',
			contenteditable: 'false',
		},
		'Plan',
	],
	renderText: () => '',
	renderMarkdown: () => '',
	addInputRules() {
		const type = this.type;
		return [
			new InputRule({
				find: /^\/plan$/,
				handler: ({ state, range }) => {
					if (range.from !== 1) return null;
					state.tr.replaceWith(range.from, range.to, [
						type.create(),
						state.schema.text(' '),
					]);
				},
			}),
		];
	},
});
