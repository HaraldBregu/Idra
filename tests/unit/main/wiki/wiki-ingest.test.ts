import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { collectWikiSources } from '../../../../src/main/wiki/wiki_collect_sources';
import { registerWikiSource } from '../../../../src/main/wiki/wiki_register_source';
import { wikiSourceStore } from '../../../../src/main/wiki/wiki_source_store';

describe('immutable wiki source registration', () => {
	beforeEach(() => {
		wikiSourceStore.store = { version: 1, sources: {} };
	});

	it('archives exact bytes without changing the source and deduplicates repeated ingest', async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-ingest-'));
		const inbox = path.join(root, 'inbox');
		const evidence = path.join(root, 'evidence');
		await import('node:fs/promises').then(({ mkdir }) => mkdir(inbox, { recursive: true }));
		const sourcePath = path.join(inbox, 'notes.md');
		const original = Buffer.from('# Notes\n\nFriday keeps durable knowledge.\n', 'utf8');
		await writeFile(sourcePath, original);
		const [source] = await collectWikiSources(inbox);

		const first = await registerWikiSource(source, 'operation-one', evidence);
		const second = await registerWikiSource(source, 'operation-two', evidence);

		expect(await readFile(sourcePath)).toEqual(original);
		expect(await readFile(first.record.archivePath)).toEqual(original);
		expect(first.record.sourceId).toMatch(/^source-[a-f0-9]{16}$/);
		expect(first.isNew).toBe(true);
		expect(second.isNew).toBe(false);
		expect(second.record.sourceId).toBe(first.record.sourceId);
		expect(Object.keys(wikiSourceStore.store.sources)).toEqual([first.record.sourceId]);
	});

	it('rejects credential-like sources before creating a registry record', async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-secret-'));
		await writeFile(
			path.join(root, '.env'),
			'API_KEY=secret-value-that-must-not-be-stored',
			'utf8'
		);
		const source = {
			absolutePath: path.join(root, '.env'),
			relativePath: '.env',
			content: 'API_KEY=secret-value-that-must-not-be-stored',
			hash: 'a'.repeat(64),
		};

		await expect(
			registerWikiSource(source, 'operation-secret', path.join(root, 'evidence'))
		).rejects.toThrow('credential-like file');
		expect(wikiSourceStore.store.sources).toEqual({});
	});
});
