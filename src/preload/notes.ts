import { typedInvokeUnwrap } from '../shared/ipc_types';
import { NotesChannels } from '../shared/ipc_channels_definitions';
import type { NotesApi } from './index.d';

function requireId(id: string): string {
	const value = typeof id === 'string' ? id.trim() : '';
	if (!value) throw new Error('Invalid note id.');
	return value;
}

export const notes: NotesApi = {
	list: () => {
		return typedInvokeUnwrap(NotesChannels.list);
	},
	get: (id) => {
		return typedInvokeUnwrap(NotesChannels.get, requireId(id));
	},
	create: (input) => {
		return typedInvokeUnwrap(NotesChannels.create, input);
	},
	update: (id, updates) => {
		return typedInvokeUnwrap(NotesChannels.update, requireId(id), updates);
	},
	delete: (id) => {
		return typedInvokeUnwrap(NotesChannels.delete, requireId(id));
	},
};
