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
import { wikiSourceStore } from '../../../../src/main/wiki/wiki_source_store';
import { wikiFailureStore } from '../../../../src/main/wiki/wiki_failure_store';
import { wikiOperationStore } from '../../../../src/main/wiki/wiki_operation_store';

describe('runWiki', () => {
	beforeEach(() => {
		generateWikiUpdate.mockReset();
		wikiSourceStore.store = { version: 1, sources: {} };
		wikiFailureStore.store = { version: 1, operations: [] };
		wikiOperationStore.store = { version: 1, operations: {} };
		wikiRuntime.run = undefined;
		wikiRuntime.lastRun = undefined;
	});

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

	it('rolls back an invalid generated change and records the failed operation', async () => {
		const root = await mkdtemp(path.join(os.tmpdir(), 'friday-wiki-failure-'));
		const sourcePath = path.join(root, 'raw');
		const targetPath = path.join(root, 'data');
		await import('node:fs/promises').then(({ mkdir }) =>
			Promise.all([mkdir(sourcePath, { recursive: true }), mkdir(targetPath, { recursive: true })])
		);
		await writeFile(path.join(sourcePath, 'invalid.md'), 'Invalid generated link', 'utf8');
		await writeFile(path.join(targetPath, 'index.md'), '# Original index\n', 'utf8');
		wikiSettingsStore.store = {
			providerId: 'openai',
			modelId: 'gpt-5',
			sourcePath,
			targetPath,
			schedule: { enabled: false, cronExpression: '0 3 * * *' },
		} as never;
		wikiStateStore.store = { sources: {} };
		generateWikiUpdate.mockImplementation(async (_settings, source) => ({
			pages: [
				{
					path: wikiSourcePage(source),
					title: 'Invalid',
					summary: 'Contains a broken link.',
					content: 'See [[Missing page]].',
					sources: [source.relativePath],
				},
			],
		}));

		await expect(runWiki()).rejects.toThrow('Broken link');
		expect(await readFile(path.join(targetPath, 'index.md'), 'utf8')).toBe('# Original index\n');
		await expect(readFile(path.join(targetPath, 'AGENTS.md'), 'utf8')).rejects.toMatchObject({
			code: 'ENOENT',
		});
		expect(Object.values(wikiOperationStore.store.operations)[0]).toMatchObject({
			status: 'rolled_back',
		});
		expect(wikiFailureStore.store.operations).toHaveLength(1);
	});

	it('returns without model or filesystem work when globally disabled', async () => {
		wikiSettingsStore.store = {
			providerId: '',
			modelId: '',
			sourcePath: '/unused/raw',
			targetPath: '/unused/data',
			enabled: false,
			schedule: { enabled: true, cronExpression: '0 3 * * *' },
		} as never;

		await expect(runWiki()).resolves.toMatchObject({
			processedSources: 0,
			skippedSources: 0,
			createdPages: 0,
			updatedPages: 0,
		});
		expect(generateWikiUpdate).not.toHaveBeenCalled();
	});
});
