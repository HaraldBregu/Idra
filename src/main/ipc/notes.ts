import type { EventBus } from '../app/event_bus';
import { createNote, deleteNote, listNotes, readNote, updateNote } from '../agent/notes';
import type { CreateNoteInput, UpdateNoteInput } from '../agent/notes';
import { NotesChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class NotesIpc implements IpcModule {
	readonly name = 'notes';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(NotesChannels.list, () => listNotes());
		registerQuery(NotesChannels.get, (id: string) => readNote(id));
		registerCommand(NotesChannels.create, (input: CreateNoteInput) => createNote(input));
		registerCommand(NotesChannels.update, (id: string, updates: UpdateNoteInput) =>
			updateNote(id, updates)
		);
		registerCommand(NotesChannels.delete, (id: string) => deleteNote(id));
	}
}
