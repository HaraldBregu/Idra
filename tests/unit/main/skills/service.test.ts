import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app } from 'electron';

import { SkillsService, SkillsServiceError } from '../../../../src/main/agent/skills';
import { makeLogger, makeTempDir } from '../test-helpers';

async function writeSkill(
	root: string,
	name: string,
	options: {
		description?: string;
		frontmatterName?: string;
		body?: string;
		allowedTools?: string;
		license?: string;
		compatibility?: string;
		resources?: Record<string, string>;
	} = {}
): Promise<string> {
	const folderPath = path.join(root, name);
	await fs.mkdir(folderPath, { recursive: true });
	const lines = [
		'---',
		`name: ${options.frontmatterName ?? name}`,
		`description: ${options.description ?? `${name} description`}`,
		options.license ? `license: ${options.license}` : '',
		options.compatibility ? `compatibility: ${options.compatibility}` : '',
		options.allowedTools ? `allowed-tools: ${options.allowedTools}` : '',
		'---',
		'',
		options.body ?? `# ${name}`,
	].filter(Boolean);
	await fs.writeFile(path.join(folderPath, 'SKILL.md'), `${lines.join('\n')}\n`);

	for (const [relativePath, content] of Object.entries(options.resources ?? {})) {
		const filePath = path.join(folderPath, relativePath);
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content);
	}

	return folderPath;
}

describe('SkillsService', () => {
	beforeEach(() => {
		(app.getPath as jest.Mock).mockImplementation((name: string) => `/tmp/friday-test/${name}`);
	});

	it('defaults the skills root to Electron appData instead of the project directory', () => {
		const service = new SkillsService(makeLogger() as never);

		expect(service.getRootPath()).toBe(
			path.join('/tmp/friday-test/appData', 'friday', 'agent', 'skills')
		);
		expect(service.getRootPath()).not.toContain(`${path.sep}appdata${path.sep}skills`);
	});

	it('resolves the configured skills root path without creating it', async () => {
		const root = path.join(await makeTempDir(), 'appdata', 'skills');
		const service = new SkillsService(makeLogger() as never, { rootPath: root });

		expect(service.getRootPath()).toBe(root);
		await expect(fs.access(root)).rejects.toThrow();
	});

	it('returns an empty list when the skills root is missing or empty', async () => {
		const root = path.join(await makeTempDir(), 'skills');
		const logger = makeLogger();
		const service = new SkillsService(logger as never, { rootPath: root });

		await expect(service.list()).resolves.toEqual([]);
		await fs.mkdir(root, { recursive: true });
		await expect(service.list()).resolves.toEqual([]);
		expect(logger.error).not.toHaveBeenCalled();
	});

	it('lists compact records and skips non-skills and invalid folders', async () => {
		const root = await makeTempDir();
		await writeSkill(root, 'greet', {
			description: 'Greets the user.',
			resources: { 'assets/template.txt': 'hello' },
		});
		await writeSkill(root, 'bad-name', { frontmatterName: 'Bad Name' });
		await fs.mkdir(path.join(root, 'not-a-skill'));
		await fs.writeFile(path.join(root, 'README.md'), 'ignore me');
		const logger = makeLogger();
		const service = new SkillsService(logger as never, { rootPath: root });

		const skills = await service.list();

		expect(skills).toEqual([
			{
				id: 'greet',
				name: 'greet',
				description: 'Greets the user.',
				location: path.join(root, 'greet'),
			},
		]);
		expect(logger.warn).toHaveBeenCalledWith(
			'SkillsService',
			'Skipped invalid skill',
			expect.objectContaining({ folderPath: path.join(root, 'bad-name') })
		);
	});

	it('searches installed skill metadata and configured skill names', async () => {
		const root = await makeTempDir();
		await writeSkill(root, 'research-brief', {
			description: 'Plan and summarize research from references.',
		});
		await writeSkill(root, 'react-ui', {
			description: 'Build polished React screens and components.',
		});
		const service = new SkillsService(makeLogger() as never, { rootPath: root });

		await expect(service.search('plan and summarize references')).resolves.toEqual([
			expect.objectContaining({ name: 'research-brief', reason: 'matched skill description' }),
		]);
		await expect(service.search('hello', { names: ['react-ui'] })).resolves.toEqual([
			expect.objectContaining({ name: 'react-ui', score: 1000, reason: 'configured for this agent' }),
		]);
	});

	it('loads full instructions and support files only when a skill is selected', async () => {
		const root = await makeTempDir();
		await writeSkill(root, 'research-brief', {
			body: '# Research Brief\n\nUse the references when needed.',
			allowedTools: 'Read Grep Bash(test:*)',
			license: 'MIT',
			compatibility: 'Requires local filesystem access.',
			resources: {
				'references/notes.md': 'notes',
				'scripts/run.sh': '#!/bin/sh\n',
				'assets/template.md': 'template',
			},
		});
		const readFileSpy = jest.spyOn(fs, 'readFile');
		const service = new SkillsService(makeLogger() as never, { rootPath: root });

		await service.list();
		expect(readFileSpy).not.toHaveBeenCalledWith(path.join(root, 'research-brief', 'SKILL.md'), 'utf8');

		const loaded = await service.load('research-brief');

		expect(loaded.instructions).toContain('Use the references when needed.');
		expect(loaded.frontmatter).toMatchObject({
			name: 'research-brief',
			description: 'research-brief description',
			license: 'MIT',
			compatibility: 'Requires local filesystem access.',
			allowedTools: ['Read', 'Grep', 'Bash(test:*)'],
		});
		expect(loaded.supportFiles.map((file) => file.relativePath)).toEqual([
			'assets/template.md',
			'references/notes.md',
			'scripts/run.sh',
		]);
		readFileSpy.mockRestore();
	});

	it('imports, downloads, and deletes skills as whole folders without implicit overwrite', async () => {
		const installRoot = path.join(await makeTempDir(), 'missing', 'skills');
		const sourceRoot = await makeTempDir();
		const downloadRoot = await makeTempDir();
		await writeSkill(sourceRoot, 'research', {
			description: 'Research workflow.',
			resources: { 'references/guide.md': 'guide' },
		});
		const logger = makeLogger();
		const service = new SkillsService(logger as never, { rootPath: installRoot });

		const imported = await service.importSkill(path.join(sourceRoot, 'research'));
		expect(imported.imported).toEqual([
			{
				id: 'research',
				name: 'research',
				description: 'Research workflow.',
				location: path.join(installRoot, 'research'),
			},
		]);
		await expect(fs.access(path.join(installRoot, 'research', 'references', 'guide.md'))).resolves.toBeUndefined();

		const skipped = await service.importSkill(path.join(sourceRoot, 'research'));
		expect(skipped).toMatchObject({
			imported: [],
			skipped: [{ name: 'research', reason: 'Skill is already installed.' }],
		});

		const downloaded = await service.downloadSkill('research', downloadRoot);
		expect(downloaded).toEqual({
			id: 'research',
			name: 'research',
			destinationPath: path.join(downloadRoot, 'research'),
		});
		await expect(fs.access(path.join(downloadRoot, 'research', 'references', 'guide.md'))).resolves.toBeUndefined();
		await expect(service.downloadSkill('research', downloadRoot)).rejects.toThrow(SkillsServiceError);

		await expect(service.deleteSkill('research')).resolves.toEqual({
			id: 'research',
			name: 'research',
			deleted: true,
		});
		await expect(service.deleteSkill('research')).resolves.toEqual({
			id: 'research',
			name: 'research',
			deleted: false,
		});
		expect(logger.info).toHaveBeenCalledWith(
			'SkillsService',
			'Imported skill "research"',
			expect.objectContaining({ destinationPath: path.join(installRoot, 'research') })
		);
	});

	it('validates SKILL.md frontmatter and folder naming rules', async () => {
		const root = await makeTempDir();
		const validPath = await writeSkill(root, 'valid-skill');
		const mismatchedPath = await writeSkill(root, 'wrong-folder', { frontmatterName: 'valid-skill' });
		const missingDescription = path.join(root, 'missing-description');
		await fs.mkdir(missingDescription, { recursive: true });
		await fs.writeFile(
			path.join(missingDescription, 'SKILL.md'),
			'---\nname: missing-description\n---\n\n# Missing\n'
		);
		const invalidYaml = path.join(root, 'invalid-yaml');
		await fs.mkdir(invalidYaml, { recursive: true });
		await fs.writeFile(path.join(invalidYaml, 'SKILL.md'), '---\nname: [oops\n---\n\n# Broken\n');
		const service = new SkillsService(makeLogger() as never, { rootPath: root });

		await expect(service.validateSkillFolder(validPath)).resolves.toMatchObject({ valid: true });
		await expect(service.validateSkillFolder(mismatchedPath)).resolves.toMatchObject({
			valid: false,
			issues: [expect.objectContaining({ code: 'invalid-name' })],
		});
		await expect(service.validateSkillFolder(missingDescription)).resolves.toMatchObject({
			valid: false,
			issues: [expect.objectContaining({ code: 'invalid-description' })],
		});
		await expect(service.validateSkillFolder(invalidYaml)).resolves.toMatchObject({
			valid: false,
			issues: [expect.objectContaining({ code: 'invalid-skill-file' })],
		});
	});

	it('throws service-level errors and logs filesystem failures', async () => {
		const root = path.join(await makeTempDir(), 'skills-file');
		await fs.writeFile(root, 'not a directory');
		const logger = makeLogger();
		const service = new SkillsService(logger as never, { rootPath: root });

		await expect(service.list()).rejects.toThrow(SkillsServiceError);
		expect(logger.error).toHaveBeenCalledWith(
			'SkillsService',
			'Failed to list skills',
			expect.objectContaining({ rootPath: root })
		);
	});
});
