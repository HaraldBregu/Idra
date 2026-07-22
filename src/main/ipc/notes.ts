import path from 'node:path';
import type { EventBus } from '../app/event_bus';
import { agentLocation } from '../shared/agent_location';
import { createNote, deleteNote, listNotes, readNote, updateNote } from '../agent/notes';
import type { Config } from '../agent/types';
import type { CreateNoteInput, UpdateNoteInput } from '../agent/notes';
import { NotesChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

function notesConfig(): Config {
	return { location: path.resolve(agentLocation()) };
}

export class NotesIpc implements IpcModule {
	readonly name = 'notes';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(NotesChannels.list, () => listNotes(notesConfig()));
		registerQuery(NotesChannels.get, (id: string) => readNote(notesConfig(), id));
		registerCommand(NotesChannels.create, (input: CreateNoteInput) =>
			createNote(notesConfig(), input)
		);
		registerCommand(NotesChannels.update, (id: string, updates: UpdateNoteInput) =>
			updateNote(notesConfig(), id, updates)
		);
		registerCommand(NotesChannels.delete, (id: string) => deleteNote(notesConfig(), id));
	}
}
