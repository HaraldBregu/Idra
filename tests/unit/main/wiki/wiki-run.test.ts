import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const generateWikiUpdate = jest.fn();

jest.mock('../../../../src/main/wiki/wiki_generate', () => ({
	generateWikiUpdate,
}));

import { runWiki } from '../../../../src/main/wiki/wiki_run';
import { wikiRuntime } from '../../../../src/main/wiki/wiki_runtime';
import { wikiSettingsStore } from '../../../../src/main/wiki/wiki_settings_store';
import { wikiSourcePage } from '../../../../src/main/wiki/wiki_source_page';
import { wikiStateStore } from '../../../../src/main/wiki/wiki_state_store';

describe('runWiki', () => {
	it('processes changed sources, skips unchanged sources and updates stable pages', async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-run-'));
		const sourcePath = path.join(root, 'raw');
		const targetPath = path.join(root, 'data');
		await import('node:fs/promises').then(({ mkdir }) => mkdir(sourcePath, { recursive: true }));
		await writeFile(path.join(sourcePath, 'notes.md'), 'Version one', 'utf8');
		wikiSettingsStore.store = {
			providerId: 'openai',
			modelId: 'gpt-5',
			sourcePath,
			targetPath,
			schedule: { enabled: false, cronExpression: '0 3 * * *' },
		};
		wikiStateStore.store = { sources: {} };
		wikiRuntime.run = undefined;
		wikiRuntime.lastRun = undefined;
		generateWikiUpdate.mockImplementation(async (_settings, source) => ({
			pages: [
				{
					path: wikiSourcePage(source),
					title: 'Notes',
					summary: 'Incremental notes.',
					content: `Compiled ${source.content}.`,
					sources: [source.relativePath],
				},
			],
		}));

		const first = await runWiki();
		const second = await runWiki();
		await writeFile(path.join(sourcePath, 'notes.md'), 'Version two', 'utf8');
		const third = await runWiki();

		expect(first).toMatchObject({ processedSources: 1, skippedSources: 0, createdPages: 1 });
		expect(second).toMatchObject({ processedSources: 0, skippedSources: 1 });
		expect(third).toMatchObject({ processedSources: 1, skippedSources: 0, updatedPages: 1 });
		expect(generateWikiUpdate).toHaveBeenCalledTimes(2);
		const sourcePage = wikiSourcePage({
			absolutePath: path.join(sourcePath, 'notes.md'),
			relativePath: 'notes.md',
			content: '',
			hash: '',
		});
		expect(await readFile(path.join(targetPath, sourcePage), 'utf8')).toContain(
			'Compiled Version two.'
		);
		const log = await readFile(path.join(targetPath, 'log.md'), 'utf8');
		expect(log.match(/ingest \| notes\.md/g)).toHaveLength(2);
	});
});
