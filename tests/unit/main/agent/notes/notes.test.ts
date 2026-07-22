import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	createNote,
	deleteNote,
	noteFilePath,
	notesSettingsPath,
	readNote,
	searchNotes,
	updateNote,
} from '../../../../../src/main/agent/notes';
import type { Config } from '../../../../../src/main/agent/types';

let root: string;
let config: Config;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-notes-'));
	config = { location: root };
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe('notes', () => {
	it('creates and reads a note with an indexed settings entry', () => {
		const note = createNote(config, {
			title: ' Release plan ',
			content: '# Friday\n\nShip it.',
			metadata: { category: 'work', priority: 2, nested: { owner: 'Ada' } },
		});

		expect(note.title).toBe('Release plan');
		expect(note.createdAt).toBe(note.updatedAt);
		expect(readNote(config, note.id)).toEqual(note);
		expect(fs.readFileSync(noteFilePath(config, note.id), 'utf8')).toBe(note.content);
		expect(JSON.parse(fs.readFileSync(notesSettingsPath(config), 'utf8'))).toEqual({
			notes: {
				[note.id]: {
					title: note.title,
					createdAt: note.createdAt,
					updatedAt: note.updatedAt,
					metadata: note.metadata,
				},
			},
		});
	});

	it('updates content and indexed metadata while preserving creation time', () => {
		const original = createNote(config, { title: 'Draft', content: 'Before' });
		const updated = updateNote(config, original.id, {
			title: 'Final',
			content: 'After',
			metadata: { status: 'done' },
		});

		expect(updated).toMatchObject({
			id: original.id,
			title: 'Final',
			content: 'After',
			createdAt: original.createdAt,
			metadata: { status: 'done' },
		});
		expect(readNote(config, original.id)).toEqual(updated);
	});

	it('searches case-insensitively across title, content, and metadata', () => {
		const title = createNote(config, { title: 'ROADMAP', content: 'First note' });
		const content = createNote(config, { title: 'Ideas', content: 'A hidden Needle' });
		const metadata = createNote(config, {
			title: 'Contacts',
			content: 'Team',
			metadata: { owner: { name: 'Needle Keeper' } },
		});

		expect(searchNotes(config, 'roadmap').map((note) => note.id)).toEqual([title.id]);
		expect(new Set(searchNotes(config, 'NEEDLE').map((note) => note.id))).toEqual(
			new Set([content.id, metadata.id])
		);
	});

	it('deletes the note file and its settings entry', () => {
		const note = createNote(config, { title: 'Temporary', content: 'Remove me' });

		expect(deleteNote(config, note.id)).toBe(true);
		expect(deleteNote(config, note.id)).toBe(false);
		expect(readNote(config, note.id)).toBeUndefined();
		expect(fs.existsSync(noteFilePath(config, note.id))).toBe(false);
		expect(JSON.parse(fs.readFileSync(notesSettingsPath(config), 'utf8'))).toEqual({ notes: {} });
	});
});
