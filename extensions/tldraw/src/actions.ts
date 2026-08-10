import type { TLUiOverrides } from 'tldraw';
import { createDocument } from './create';
import { openDocument } from './open';
import { saveDocument } from './save';

export const overrides: TLUiOverrides = {
	actions(editor, actions, helpers) {
		const fridayActions: typeof actions = {
			...actions,
			'new-project': {
				id: 'new-project',
				label: 'action.new-project',
				kbd: 'cmd+n,ctrl+n',
				onSelect: createDocument.bind(null, editor, helpers),
			},
			'open-file': {
				id: 'open-file',
				label: 'action.open-file',
				kbd: 'cmd+o,ctrl+o',
				onSelect: openDocument.bind(null, editor, helpers),
			},
			'save-copy': {
				id: 'save-copy',
				label: 'action.save-copy',
				kbd: 'cmd+s,ctrl+s',
				readonlyOk: true,
				onSelect: saveDocument.bind(null, editor, helpers),
			},
		};
		delete fridayActions['toggle-dark-mode'];
		return fridayActions;
	},
};
