import { Extension } from '@tiptap/core';
import { type Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const commandPattern = /(^|\s)(\/(?:skill|task_list|create_task|delete_task))(?=\s|$)/gi;

function decorate(doc: Node): DecorationSet {
	const decorations: Decoration[] = [];
	doc.descendants((node, pos) => {
		if (!node.isText || !node.text) return;
		for (const match of node.text.matchAll(commandPattern)) {
			const from = pos + match.index + match[1].length;
			decorations.push(
				Decoration.inline(from, from + match[2].length, { class: 'text-command' })
			);
		}
	});
	return DecorationSet.create(doc, decorations);
}

export const SlashHighlight = Extension.create({
	name: 'slashHighlight',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('slashHighlight'),
				state: {
					init: (_, { doc }) => decorate(doc),
					apply: (tr, old) => (tr.docChanged ? decorate(tr.doc) : old),
				},
				props: {
					decorations(state) {
						return this.getState(state);
					},
				},
			}),
		];
	},
});
