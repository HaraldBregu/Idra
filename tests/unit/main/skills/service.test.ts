import path from 'node:path';
import { promises as fs } from 'node:fs';

import { SkillsService } from '../../../../src/main/skills';
import { makeLogger, makeTempDir } from '../test-helpers';

async function writeSkill(
	root: string,
	id: string,
	frontmatter: Record<string, unknown> = {}
): Promise<string> {
	const folderPath = path.join(root, id);
	await fs.mkdir(path.join(folderPath, 'assets'), { recursive: true });
	const lines = [
		'---',
		`name: ${frontmatter.name ?? id}`,
		`description: ${frontmatter.description ?? `${id} description`}`,
		`version: ${frontmatter.version ?? '1.0.0'}`,
		'id' in frontmatter ? `id: ${frontmatter.id}` : '',
		'tags' in frontmatter ? `tags: [${(frontmatter.tags as string[]).join(', ')}]` : '',
		'---',
		'',
		`# ${frontmatter.name ?? id}`,
	].filter(Boolean);
	await fs.writeFile(path.join(folderPath, 'SKILL.md'), `${lines.join('\n')}\n`);
	return folderPath;
}

describe('SkillsService', () => {
	it('resolves the configured skills root path', async () => {
		const root = path.join(await makeTempDir(), 'appdata', 'skills');
		const service = new SkillsService(makeLogger() as never, { rootPath: root });

		expect(service.getRootPath()).toBe(root);
		await fs.rm(path.dirname(path.dirname(root)), { recursive: true, force: true });
	});

	it('lists installed skills from the exported service', async () => {
		const root = await makeTempDir();
		await writeSkill(root, 'greet', { name: 'Greet', tags: ['hello', 'support'] });
		const logger = makeLogger();
		const service = new SkillsService(logger as never, { rootPath: root });

		const skills = await service.list();

		expect(skills).toMatchObject([
			{
				id: 'greet',
				manifest: {
					id: 'greet',
					name: 'Greet',
					description: 'greet description',
					tags: ['hello', 'support'],
				},
				structure: {
					format: 'agent-skill',
					standard: 'agentskills.io',
					kind: 'direct',
					resourceDirectories: ['assets'],
				},
			},
		]);
		expect(skills[0]?.skillPath).toBe(path.join(root, 'greet', 'SKILL.md'));
		expect(logger.info).toHaveBeenCalledWith('SkillsService', 'Listed 1 skill(s)', { rootPath: root });
		await fs.rm(root, { recursive: true, force: true });
	});

	it('imports, downloads, and deletes skills through the service', async () => {
		const installRoot = await makeTempDir();
		const sourceRoot = await makeTempDir();
		const downloadRoot = await makeTempDir();
		await writeSkill(sourceRoot, 'source-skill', { id: 'research', name: 'Research' });
		const logger = makeLogger();
		const service = new SkillsService(logger as never, { rootPath: installRoot });

		const imported = await service.importSkill(path.join(sourceRoot, 'source-skill'));
		expect(imported.imported).toHaveLength(1);
		expect(imported.imported[0]?.id).toBe('research');
		await expect(fs.access(path.join(installRoot, 'research', 'SKILL.md'))).resolves.toBeUndefined();

		const downloaded = await service.downloadSkill('research', downloadRoot);
		expect(downloaded).toEqual({
			id: 'research',
			destinationPath: path.join(downloadRoot, 'research'),
		});
		await expect(fs.access(path.join(downloadRoot, 'research', 'SKILL.md'))).resolves.toBeUndefined();

		await service.deleteSkill('research');
		await expect(fs.access(path.join(installRoot, 'research'))).rejects.toThrow();
		expect(logger.info).toHaveBeenCalledWith(
			'SkillsService',
			'Imported skill "research"',
			expect.objectContaining({ destinationPath: path.join(installRoot, 'research') })
		);
		expect(logger.info).toHaveBeenCalledWith(
			'SkillsService',
			'Downloaded skill "research"',
			{ destinationPath: path.join(downloadRoot, 'research') }
		);
		expect(logger.info).toHaveBeenCalledWith(
			'SkillsService',
			'Deleted skill "research"',
			{ folderPath: path.join(installRoot, 'research') }
		);
		await fs.rm(installRoot, { recursive: true, force: true });
		await fs.rm(sourceRoot, { recursive: true, force: true });
		await fs.rm(downloadRoot, { recursive: true, force: true });
	});

	it('logs failures through the application logger', async () => {
		const root = path.join(await makeTempDir(), 'skills-file');
		await fs.writeFile(root, 'not a directory');
		const logger = makeLogger();
		const service = new SkillsService(logger as never, { rootPath: root });

		await expect(service.list()).resolves.toEqual([]);

		expect(logger.error).toHaveBeenCalledWith(
			'SkillsService',
			'Failed to list skills',
			expect.objectContaining({ rootPath: root })
		);
		await fs.rm(path.dirname(root), { recursive: true, force: true });
	});
});
