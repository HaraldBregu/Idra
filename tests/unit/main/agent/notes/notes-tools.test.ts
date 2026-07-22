import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Config } from '../../../../../src/main/agent/types';
import { createNoteTool } from '../../../../../src/main/agent/tools/note_create';
import { deleteNoteTool } from '../../../../../src/main/agent/tools/note_delete';
import { readNoteTool } from '../../../../../src/main/agent/tools/note_read';
import { searchNotesTool } from '../../../../../src/main/agent/tools/note_search';
import { updateNoteTool } from '../../../../../src/main/agent/tools/note_update';

let root: string;
let config: Config;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-note-tools-'));
	config = { location: root };
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

it('exposes create, read, update, search, and confirmed delete tools', async () => {
	const create = createNoteTool(config);
	const read = readNoteTool(config);
	const update = updateNoteTool(config);
	const search = searchNotesTool(config);
	const remove = deleteNoteTool(config);

	expect([create.name, read.name, update.name, search.name, remove.name]).toEqual([
		'create_note',
		'read_note',
		'update_note',
		'search_notes',
		'delete_note',
	]);
	expect(remove.alwaysAsk).toBe(true);

	const created = (await create.run({ title: 'Tool note', content: 'Original' })) as { id: string };
	await update.run({ id: created.id, content: 'Searchable result' });
	expect(await read.run({ id: created.id })).toMatchObject({
		id: created.id,
		content: 'Searchable result',
	});
	expect(await search.run({ query: 'searchable' })).toMatchObject({
		notes: [{ id: created.id }],
	});
	expect(await remove.run({ id: created.id })).toEqual({ id: created.id, deleted: true });
});
