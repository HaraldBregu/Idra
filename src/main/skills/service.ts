import matter from 'gray-matter';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { LoggerService } from '../logger';
import type {
	SkillDiagnostic,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
	SkillManifest,
	SkillStructureInfo,
} from '../../shared/skills';

const LOG_SOURCE = 'SkillsService';
const SKILL_FILE_NAME = 'SKILL.md';
const SKILL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export interface SkillsServiceOptions {
	rootPath?: string;
}

type SkillsLogger = Pick<LoggerService, 'info' | 'warn' | 'error'>;
type ImportCandidate = { folderPath: string; kind: SkillStructureInfo['kind'] };

export class SkillsService {
	private readonly rootPath: string;

	constructor(
		private readonly logger: SkillsLogger,
		options: SkillsServiceOptions = {}
	) {
		this.rootPath = path.resolve(options.rootPath ?? path.join('appdata', 'skills'));
	}

	getRootPath(): string {
		return this.rootPath;
	}

	async list(): Promise<SkillInfo[]> {
		try {
			const entries = await fs.readdir(this.rootPath, { withFileTypes: true });
			const skills = (
				await Promise.all(
					entries
						.filter((entry) => entry.isDirectory())
						.map((entry) => this.loadSkill(path.join(this.rootPath, entry.name), 'direct'))
				)
			)
				.filter((skill): skill is SkillInfo => skill !== null)
				.sort((a, b) => a.id.localeCompare(b.id));

			this.logger.info(LOG_SOURCE, `Listed ${skills.length} skill(s)`, { rootPath: this.rootPath });
			return skills;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				this.logger.info(LOG_SOURCE, 'Listed 0 skill(s)', { rootPath: this.rootPath });
				return [];
			}

			this.logger.error(LOG_SOURCE, 'Failed to list skills', { rootPath: this.rootPath, error });
			return [];
		}
	}

	async importSkill(sourcePath: string): Promise<SkillImportResult> {
		const source = this.resolveExternalPath(sourcePath, 'Skill import source');

		try {
			const candidates = await this.collectImportCandidates(source);
			const result: SkillImportResult = { imported: [], skipped: [] };
			await fs.mkdir(this.rootPath, { recursive: true });

			for (const candidate of candidates) {
				const skill = await this.loadSkill(candidate.folderPath, candidate.kind);
				if (!skill) {
					result.skipped.push({
						name: path.basename(candidate.folderPath),
						sourcePath: candidate.folderPath,
						reason: `${SKILL_FILE_NAME} is missing or invalid`,
					});
					this.logger.warn(LOG_SOURCE, 'Skipped skill import', result.skipped.at(-1));
					continue;
				}

				const destinationPath = path.join(this.rootPath, skill.id);
				if (!samePath(candidate.folderPath, destinationPath)) {
					await fs.rm(destinationPath, { recursive: true, force: true });
					await fs.cp(candidate.folderPath, destinationPath, { recursive: true });
				}

				const imported = await this.loadSkill(destinationPath, 'direct');
				if (imported) result.imported.push(imported);
				this.logger.info(LOG_SOURCE, `Imported skill "${skill.id}"`, {
					sourcePath: candidate.folderPath,
					destinationPath,
				});
			}

			return result;
		} catch (error) {
			this.logger.error(LOG_SOURCE, 'Failed to import skills', { sourcePath: source, error });
			throw error;
		}
	}

	async downloadSkill(id: string, destinationRoot: string): Promise<SkillDownloadResult> {
		const safeId = this.requireSkillId(id);
		const destinationParent = this.resolveExternalPath(destinationRoot, 'Skill download destination');

		try {
			const skill = await this.getInstalledSkill(safeId);
			const destinationPath = path.join(destinationParent, path.basename(skill.folderPath));
			if (samePath(skill.folderPath, destinationPath)) {
				throw new Error('Skill download destination must be outside the installed skill folder.');
			}

			await fs.mkdir(destinationParent, { recursive: true });
			await fs.rm(destinationPath, { recursive: true, force: true });
			await fs.cp(skill.folderPath, destinationPath, { recursive: true });
			this.logger.info(LOG_SOURCE, `Downloaded skill "${skill.id}"`, { destinationPath });
			return { id: skill.id, destinationPath };
		} catch (error) {
			this.logger.error(LOG_SOURCE, `Failed to download skill "${safeId}"`, { destinationRoot, error });
			throw error;
		}
	}

	async deleteSkill(id: string): Promise<void> {
		const safeId = this.requireSkillId(id);

		try {
			const skill = await this.getInstalledSkill(safeId);
			await fs.rm(skill.folderPath, { recursive: true, force: true });
			this.logger.info(LOG_SOURCE, `Deleted skill "${skill.id}"`, { folderPath: skill.folderPath });
		} catch (error) {
			this.logger.error(LOG_SOURCE, `Failed to delete skill "${safeId}"`, { error });
			throw error;
		}
	}

	private async getInstalledSkill(id: string): Promise<SkillInfo> {
		const skill = (await this.list()).find((item) => item.id === id);
		if (!skill) throw new Error(`Skill not found: ${id}`);
		return skill;
	}

	private async collectImportCandidates(sourcePath: string): Promise<ImportCandidate[]> {
		const stat = await fs.stat(sourcePath);
		if (!stat.isDirectory()) throw new Error('Skill import source must be a directory.');
		if (await this.hasSkillFile(sourcePath)) return [{ folderPath: sourcePath, kind: 'direct' }];

		const entries = await fs.readdir(sourcePath, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => ({ folderPath: path.join(sourcePath, entry.name), kind: 'container-child' }));
	}

	private async hasSkillFile(folderPath: string): Promise<boolean> {
		try {
			await fs.access(path.join(folderPath, SKILL_FILE_NAME));
			return true;
		} catch {
			return false;
		}
	}

	private async loadSkill(
		folderPath: string,
		kind: SkillStructureInfo['kind']
	): Promise<SkillInfo | null> {
		const skillPath = path.join(folderPath, SKILL_FILE_NAME);
		try {
			const content = await fs.readFile(skillPath, 'utf8');
			const diagnostics: SkillDiagnostic[] = [];
			const manifest = this.readManifest(content, path.basename(folderPath), diagnostics);
			const id = this.normalizeSkillId(manifest.id ?? path.basename(folderPath));
			if (!id) {
				this.logger.warn(LOG_SOURCE, 'Skipped skill with invalid id', { folderPath, id: manifest.id });
				return null;
			}

			manifest.id = id;
			return {
				id,
				folderPath,
				skillPath,
				manifest,
				...(diagnostics.length > 0 ? { diagnostics } : {}),
				structure: {
					format: 'agent-skill',
					standard: 'agentskills.io',
					kind,
					resourceDirectories: await this.listResourceDirectories(folderPath),
				},
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			this.logger.warn(LOG_SOURCE, 'Skipped unreadable skill', { folderPath, error });
			return null;
		}
	}

	private readManifest(
		content: string,
		fallbackId: string,
		diagnostics: SkillDiagnostic[]
	): SkillManifest {
		const data = matter(content).data;
		const record = isRecord(data) ? data : {};
		const name = readString(record.name) ?? fallbackId;
		if (!readString(record.name)) {
			diagnostics.push({
				level: 'warning',
				code: 'missing-name',
				message: 'Skill manifest is missing a name.',
			});
		}

		const manifest: SkillManifest = { name };
		this.assignString(manifest, 'id', record.id);
		this.assignString(manifest, 'description', record.description);
		this.assignString(manifest, 'license', record.license);
		this.assignString(manifest, 'compatibility', record.compatibility);
		this.assignString(manifest, 'category', record.category);
		this.assignString(manifest, 'version', record.version);
		this.assignString(manifest, 'author', record.author);
		this.assignString(manifest, 'visibility', record.visibility);
		this.assignString(manifest, 'safetyLevel', record.safetyLevel);
		this.assignStringArray(manifest, 'tags', record.tags);
		this.assignStringArray(manifest, 'permissionsRequired', record.permissionsRequired);
		this.assignStringArray(manifest, 'requiredTools', record.requiredTools);
		this.assignStringArray(manifest, 'allowedTools', record.allowedTools);
		this.assignStringArray(manifest, 'requiredConnectors', record.requiredConnectors);
		this.assignStringArray(manifest, 'requiredMemoryKinds', record.requiredMemoryKinds);
		if (typeof record.enabled === 'boolean') manifest.enabled = record.enabled;
		if (typeof record.deprecated === 'boolean') manifest.deprecated = record.deprecated;
		if (typeof record.estimatedCost === 'number') manifest.estimatedCost = record.estimatedCost;
		if (typeof record.estimatedLatency === 'number') manifest.estimatedLatency = record.estimatedLatency;
		if (typeof record.reliabilityScore === 'number') manifest.reliabilityScore = record.reliabilityScore;
		if (isRecord(record.inputSchema)) manifest.inputSchema = record.inputSchema;
		if (isRecord(record.outputSchema)) manifest.outputSchema = record.outputSchema;
		if (Array.isArray(record.examples)) manifest.examples = record.examples as SkillManifest['examples'];
		if (Array.isArray(record.dependencies)) {
			manifest.dependencies = record.dependencies as SkillManifest['dependencies'];
		}
		if (isRecord(record.metadata)) manifest.metadata = record.metadata;
		return manifest;
	}

	private assignString<K extends keyof SkillManifest>(
		manifest: SkillManifest,
		key: K,
		value: unknown
	): void {
		const text = readString(value);
		if (text) (manifest as Record<string, unknown>)[key] = text;
	}

	private assignStringArray<K extends keyof SkillManifest>(
		manifest: SkillManifest,
		key: K,
		value: unknown
	): void {
		if (!Array.isArray(value)) return;
		const values = value.map(readString).filter((item): item is string => item !== undefined);
		if (values.length > 0) (manifest as Record<string, unknown>)[key] = values;
	}

	private async listResourceDirectories(folderPath: string): Promise<string[]> {
		try {
			const entries = await fs.readdir(folderPath, { withFileTypes: true });
			return entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name)
				.sort((a, b) => a.localeCompare(b));
		} catch {
			return [];
		}
	}

	private requireSkillId(value: string): string {
		const id = this.normalizeSkillId(value);
		if (!id) throw new Error('Invalid skill id');
		return id;
	}

	private normalizeSkillId(value: string): string | null {
		const trimmed = value.trim();
		if (!SKILL_ID_PATTERN.test(trimmed)) return null;
		if (trimmed.includes('..') || /[\\/]/.test(trimmed)) return null;
		return trimmed;
	}

	private resolveExternalPath(value: string, label: string): string {
		if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required.`);
		return path.resolve(value);
	}
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function samePath(a: string, b: string): boolean {
	return path.resolve(a) === path.resolve(b);
}
