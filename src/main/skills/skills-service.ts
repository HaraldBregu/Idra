import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { LoggerService } from '../logger';
import type { SkillInfo, SkillManifest } from '../../shared/skills';

function stripYamlString(value: string): string {
	const trimmed = value.trim();
	const quote = trimmed[0];
	if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
}

function parseSkillManifest(raw: string, fallbackName: string): SkillManifest {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	const manifest: Partial<SkillManifest> = {};

	if (match) {
		for (const line of match[1].split(/\r?\n/)) {
			const separator = line.indexOf(':');
			if (separator <= 0) continue;
			const key = line.slice(0, separator).trim();
			const value = stripYamlString(line.slice(separator + 1));
			if (key === 'name' && value) {
				manifest.name = value;
			}
			if (key === 'description' && value) {
				manifest.description = value;
			}
		}
	}

	return {
		name: manifest.name ?? fallbackName,
		description: manifest.description,
	};
}

function toSkillId(value: string): string {
	const id = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

	if (!id) {
		throw new Error('Skill folder name must contain letters or numbers.');
	}

	return id;
}

export class SkillsService {
	constructor(private readonly logger: LoggerService) {}

	getSkillsRoot(): string {
		const root = path.join(app.getPath('userData'), 'skills');
		fs.mkdirSync(root, { recursive: true });
		return root;
	}

	async list(): Promise<SkillInfo[]> {
		const root = this.getSkillsRoot();
		const entries = await fs.promises.readdir(root, { withFileTypes: true });
		const skills: SkillInfo[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const id = entry.name;
			const folderPath = path.join(root, id);
			const skill = await this.readSkillInfo(folderPath, id);
			if (skill) {
				skills.push(skill);
			}
		}

		skills.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
		return skills;
	}

	async importFromPath(sourceDir: string): Promise<SkillInfo> {
		const source = path.resolve(sourceDir);
		const stat = await fs.promises.stat(source);
		if (!stat.isDirectory()) {
			throw new Error('Select a skill folder.');
		}

		await fs.promises.access(path.join(source, 'SKILL.md'), fs.constants.R_OK);

		const id = toSkillId(path.basename(source));
		const target = this.resolveSkillDir(id);

		if (source === target) {
			throw new Error('This skill is already managed by Friday.');
		}

		try {
			await fs.promises.cp(source, target, {
				recursive: true,
				errorOnExist: true,
				force: false,
			});
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ERR_FS_CP_EEXIST') {
				throw new Error(`Skill already exists: ${id}`);
			}
			throw error;
		}

		const skill = await this.readSkillInfo(target, id);
		if (!skill) {
			await fs.promises.rm(target, { recursive: true, force: true });
			throw new Error('Imported folder is missing SKILL.md.');
		}

		this.logger.info('SkillsService', `Imported skill folder: ${id}`);
		return skill;
	}

	async delete(id: string): Promise<void> {
		const folderPath = this.resolveSkillDir(id);
		await fs.promises.rm(folderPath, { recursive: true, force: true });
		this.logger.info('SkillsService', `Deleted skill folder: ${id}`);
	}

	private resolveSkillDir(id: string): string {
		if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) {
			throw new Error(`Invalid skill id: ${id}`);
		}

		const root = path.resolve(this.getSkillsRoot());
		const folderPath = path.resolve(path.join(root, id));
		if (path.dirname(folderPath) !== root) {
			throw new Error(`Skill id escapes skills root: ${id}`);
		}

		return folderPath;
	}

	private async readSkillInfo(folderPath: string, id: string): Promise<SkillInfo | null> {
		const skillPath = path.join(folderPath, 'SKILL.md');
		try {
			const raw = await fs.promises.readFile(skillPath, 'utf8');
			return {
				id,
				folderPath,
				manifest: parseSkillManifest(raw, id),
			};
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code !== 'ENOENT') {
				this.logger.warn('SkillsService', `Skipping ${id}: cannot read SKILL.md`, {
					error: (error as Error).message,
				});
			}
			return null;
		}
	}
}
