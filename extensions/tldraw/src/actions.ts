import type { TLUiOverrides } from 'tldraw';
import { createDocument } from './create';
import { openDocument } from './open';
import { saveDocument } from './save';

export const overrides: TLUiOverrides = {
	actions(editor, actions) {
		return {
			...actions,
			'new-project': {
				id: 'new-project',
				label: 'action.new-project',
				kbd: '$mod+n',
				onSelect: createDocument.bind(null, editor),
			},
			'open-file': {
				id: 'open-file',
				label: 'action.open-file',
				kbd: '$mod+o',
				onSelect: openDocument.bind(null, editor),
			},
			'save-copy': {
				id: 'save-copy',
				label: 'action.save-copy',
				kbd: '$mod+s',
				onSelect: saveDocument.bind(null, editor),
			},
		};
	},
};
