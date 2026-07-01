import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, dialog, shell, type OpenDialogOptions } from 'electron';
import matter from 'gray-matter';
import type {
	SkillDeleteResult,
	SkillDownloadResult,
	SkillImportResult,
	SkillImportSkipped,
	SkillInfo,
	SkillLoadResult,
	SkillManifest,
	SkillValidationIssue,
	SkillValidationResult,
} from '../../../shared/skills/types';
import { agentLocation } from '../shared/location';
import { getSkill, removeSkill, setSkill } from './skills-store';

const SKILL_FILE = 'SKILL.md';
const RESOURCE_DIRECTORIES = ['scripts', 'references', 'assets'] as const;
const root = path.resolve(agentLocation(), 'skills');

export function getRoot(): string {
	return root;
}

export function list(): SkillInfo[] {
	if (!fs.existsSync(root)) return [];
	const skills: SkillInfo[] = [];
	for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const info = readSkill(path.join(root, entry.name), entry.name);
		if (info) skills.push(info);
	}
	return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function listSkills(): { title: string; description: string }[] {
	return list()
		.filter((skill) => skill.manifest.enabled !== false)
		.map((skill) => ({ title: skill.name, description: skill.description }));
}

export async function loadSkill(name: string): Promise<SkillLoadResult | undefined> {
	const wanted = name.trim().toLowerCase();
	const skill = list()
		.filter((entry) => entry.manifest.enabled !== false)
		.find((entry) => entry.name.toLowerCase() === wanted || entry.id.toLowerCase() === wanted);
	if (!skill || !skill.skillPath) return undefined;
	const content = fs.readFileSync(skill.skillPath, 'utf8');
	return {
		name: skill.name,
		directory: skill.folderPath,
		content: stripFrontmatter(content),
	};
}

export async function importSkills(): Promise<SkillImportResult | undefined> {
	const sources = await pickDirectories({
		title: 'Select skill folder(s) to upload',
		properties: ['openDirectory', 'multiSelections'],
	});
	if (!sources) return undefined;

	fs.mkdirSync(root, { recursive: true });
	const imported: SkillInfo[] = [];
	const skipped: SkillImportSkipped[] = [];

	for (const source of sources) {
		const validation = validateSkill(source);
		if (!validation.valid) {
			skipped.push({
				name: path.basename(source),
				sourcePath: source,
				reason: validation.issues.map((issue) => issue.message).join('; '),
			});
			continue;
		}
		const id = slug(path.basename(source));
		const destination = path.join(root, id);
		fs.rmSync(destination, { recursive: true, force: true });
		fs.cpSync(source, destination, { recursive: true });
		setSkill(id, { enabled: true });
		const info = readSkill(destination, id);
		if (info) imported.push(info);
	}

	return { imported, skipped };
}

export async function downloadSkill(id: string): Promise<SkillDownloadResult | undefined> {
	const folder = resolveSkillFolder(id);
	if (!fs.existsSync(folder)) throw new Error(`Skill "${id}" not found.`);
	const targets = await pickDirectories({
		title: 'Choose where to download the skill',
		properties: ['openDirectory', 'createDirectory'],
	});
	if (!targets) return undefined;
	const destination = path.join(targets[0], id);
	fs.cpSync(folder, destination, { recursive: true });
	return { id, destinationPath: destination, name: readSkill(folder, id)?.name };
}

export function deleteSkill(id: string): SkillDeleteResult {
	const folder = resolveSkillFolder(id);
	const name = readSkill(folder, id)?.name ?? id;
	fs.rmSync(folder, { recursive: true, force: true });
	removeSkill(id);
	return { id, name, deleted: true };
}

export async function openRoot(): Promise<void> {
	fs.mkdirSync(root, { recursive: true });
	const error = await shell.openPath(root);
	if (error) throw new Error(error);
}

export function setEnabled(id: string, enabled: boolean): SkillInfo {
	const folder = resolveSkillFolder(id);
	const info = readSkill(folder, id);
	if (!info) throw new Error(`Skill "${id}" not found.`);
	setSkill(id, { enabled });
	return { ...info, manifest: { ...info.manifest, enabled } };
}

export function validateSkill(folder: string): SkillValidationResult {
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

function readSkill(folder: string, id: string): SkillInfo | undefined {
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
		enabled: getSkill(id)?.enabled ?? true,
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

function resolveSkillFolder(id: string): string {
	if (!/^[a-z0-9._-]+$/i.test(id) || id === '.' || id === '..') {
		throw new Error(`Invalid skill id: "${id}".`);
	}
	const folder = path.resolve(root, id);
	if (path.dirname(folder) !== path.resolve(root)) {
		throw new Error(`Skill id "${id}" escapes the skills root.`);
	}
	return folder;
}

async function pickDirectories(options: OpenDialogOptions): Promise<string[] | undefined> {
	const window = BrowserWindow.getFocusedWindow();
	const result = await (window
		? dialog.showOpenDialog(window, options)
		: dialog.showOpenDialog(options));
	return result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths;
}

function slug(value: string): string {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized || 'skill';
}

function stripFrontmatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	return match ? content.slice(match[0].length).trim() : content.trim();
}
