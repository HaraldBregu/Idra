import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, dialog, shell, type OpenDialogOptions } from 'electron';
import matter from 'gray-matter';
import { Service } from 'typedi';
import type {
	SkillDeleteResult,
	SkillDownloadResult,
	SkillImportResult,
	SkillImportSkipped,
	SkillInfo,
	SkillManifest,
	SkillValidationIssue,
	SkillValidationResult,
} from '../../shared/skills/types';
import { resolveSkillsRoot, SkillsStore } from './store';

const SKILL_FILE = 'SKILL.md';
const RESOURCE_DIRECTORIES = ['scripts', 'references', 'assets'] as const;

export interface SkillsServiceOptions {
	cwd?: string;
}

@Service()
export class SkillsService {
	private readonly store: SkillsStore;
	private readonly root: string;

	constructor(options: SkillsServiceOptions = {}) {
		this.root = options.cwd ?? resolveSkillsRoot();
		this.store = new SkillsStore(this.root);
	}

	getRoot(): string {
		return this.root;
	}

	list(): SkillInfo[] {
		if (!fs.existsSync(this.root)) return [];
		const skills: SkillInfo[] = [];
		for (const entry of fs.readdirSync(this.root, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const info = this.read(path.join(this.root, entry.name), entry.name);
			if (info) skills.push(info);
		}
		return skills.sort((a, b) => a.name.localeCompare(b.name));
	}

	async import(): Promise<SkillImportResult | undefined> {
		const sources = await this.pickDirectories({
			title: 'Select skill folder(s) to upload',
			properties: ['openDirectory', 'multiSelections'],
		});
		if (!sources) return undefined;

		fs.mkdirSync(this.root, { recursive: true });
		const imported: SkillInfo[] = [];
		const skipped: SkillImportSkipped[] = [];

		for (const source of sources) {
			const validation = this.validate(source);
			if (!validation.valid) {
				skipped.push({
					name: path.basename(source),
					sourcePath: source,
					reason: validation.issues.map((issue) => issue.message).join('; '),
				});
				continue;
			}
			const id = slug(path.basename(source));
			const destination = path.join(this.root, id);
			fs.rmSync(destination, { recursive: true, force: true });
			fs.cpSync(source, destination, { recursive: true });
			this.store.set(id, { enabled: true });
			const info = this.read(destination, id);
			if (info) imported.push(info);
		}

		return { imported, skipped };
	}

	async download(id: string): Promise<SkillDownloadResult | undefined> {
		const folder = this.resolveSkillFolder(id);
		if (!fs.existsSync(folder)) throw new Error(`Skill "${id}" not found.`);
		const targets = await this.pickDirectories({
			title: 'Choose where to download the skill',
			properties: ['openDirectory', 'createDirectory'],
		});
		if (!targets) return undefined;
		const destination = path.join(targets[0], id);
		fs.cpSync(folder, destination, { recursive: true });
		return { id, destinationPath: destination, name: this.read(folder, id)?.name };
	}

	delete(id: string): SkillDeleteResult {
		const folder = this.resolveSkillFolder(id);
		const name = this.read(folder, id)?.name ?? id;
		fs.rmSync(folder, { recursive: true, force: true });
		this.store.remove(id);
		return { id, name, deleted: true };
	}

	async openRoot(): Promise<void> {
		fs.mkdirSync(this.root, { recursive: true });
		const error = await shell.openPath(this.root);
		if (error) throw new Error(error);
	}

	setEnabled(id: string, enabled: boolean): SkillInfo {
		const folder = this.resolveSkillFolder(id);
		const info = this.read(folder, id);
		if (!info) throw new Error(`Skill "${id}" not found.`);
		this.store.set(id, { enabled });
		return { ...info, manifest: { ...info.manifest, enabled } };
	}

	validate(folder: string): SkillValidationResult {
		const issues: SkillValidationIssue[] = [];
		const skillPath = path.join(folder, SKILL_FILE);
		if (!fs.existsSync(skillPath)) {
			issues.push({ code: 'missing-skill-md', message: `${SKILL_FILE} not found in ${folder}.` });
			return { valid: false, issues };
		}
		const data = matter(fs.readFileSync(skillPath, 'utf8')).data as Record<string, unknown>;
		if (typeof data.name !== 'string' || data.name.trim() === '') {
			issues.push({ code: 'missing-name', message: 'SKILL.md frontmatter is missing "name".' });
		}
		if (typeof data.description !== 'string' || data.description.trim() === '') {
			issues.push({
				code: 'missing-description',
				message: 'SKILL.md frontmatter is missing "description".',
			});
		}
		return { valid: issues.length === 0, issues };
	}

	private read(folder: string, id: string): SkillInfo | undefined {
		const skillPath = path.join(folder, SKILL_FILE);
		if (!fs.existsSync(skillPath)) return undefined;
		const fm = matter(fs.readFileSync(skillPath, 'utf8')).data as Partial<SkillManifest>;
		const name = typeof fm.name === 'string' && fm.name.trim() ? fm.name : id;
		const description = typeof fm.description === 'string' ? fm.description : '';
		const manifest: SkillManifest = {
			...fm,
			name,
			description,
			id,
			enabled: this.store.get(id)?.enabled ?? true,
		};
		return {
			id,
			name,
			description,
			location: folder,
			folderPath: folder,
			skillPath,
			manifest,
			structure: {
				format: 'agent-skill',
				standard: 'agentskills.io',
				kind: 'direct',
				resourceDirectories: RESOURCE_DIRECTORIES.filter((dir) =>
					fs.existsSync(path.join(folder, dir)),
				),
			},
		};
	}

	private resolveSkillFolder(id: string): string {
		if (!/^[a-z0-9._-]+$/i.test(id) || id === '.' || id === '..') {
			throw new Error(`Invalid skill id: "${id}".`);
		}
		const folder = path.resolve(this.root, id);
		if (path.dirname(folder) !== path.resolve(this.root)) {
			throw new Error(`Skill id "${id}" escapes the skills root.`);
		}
		return folder;
	}

	private async pickDirectories(options: OpenDialogOptions): Promise<string[] | undefined> {
		const window = BrowserWindow.getFocusedWindow();
		const result = await (window
			? dialog.showOpenDialog(window, options)
			: dialog.showOpenDialog(options));
		return result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths;
	}
}

export { resolveSkillsRoot } from './store';

function slug(value: string): string {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized || 'skill';
}
