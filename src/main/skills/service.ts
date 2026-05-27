import matter from 'gray-matter';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { LoggerService } from '../logger';
import { resolveDefaultAppDataPath } from '../agent/storage';
import type {
	SkillDetails,
	SkillDownloadResult,
	SkillFrontmatter,
	SkillImportResult,
	SkillInfo,
	SkillSearchOptions,
	SkillSearchResult,
	SkillSupportFile,
	SkillValidationIssue,
	SkillValidationResult,
} from '../../shared/skills';

const LOG_SOURCE = 'SkillsService';
const SKILL_FILE_NAME = 'SKILL.md';
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_FRONTMATTER_BYTES = 64 * 1024;
const SUPPORT_DIRECTORIES = new Set(['scripts', 'references', 'assets']);
const DEFAULT_SKILL_SEARCH_LIMIT = 3;
const MAX_SKILL_SEARCH_LIMIT = 12;
const SKILL_SEARCH_STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'about']);

export interface SkillsServiceOptions {
	rootPath?: string;
}

export interface SkillWriteOptions {
	replace?: boolean;
}

export type SkillsServiceErrorCode =
	| 'invalid-input'
	| 'invalid-skill'
	| 'not-found'
	| 'already-exists'
	| 'filesystem';

export class SkillsServiceError extends Error {
	readonly code: SkillsServiceErrorCode;

	constructor(code: SkillsServiceErrorCode, message: string) {
		super(message);
		this.name = 'SkillsServiceError';
		this.code = code;
	}
}

type SkillsLogger = Pick<LoggerService, 'info' | 'warn' | 'error'>;
type SkillCandidate = {
	folderPath: string;
	folderName: string;
};
type ParsedSkill = {
	info: SkillInfo;
	frontmatter: SkillFrontmatter;
	instructions?: string;
};

export class SkillsService {
	private readonly rootPath: string;

	constructor(
		private readonly logger: SkillsLogger,
		options: SkillsServiceOptions = {}
	) {
		this.rootPath = path.resolve(options.rootPath ?? resolveDefaultAppDataPath('skills'));
	}

	getRootPath(): string {
		return this.rootPath;
	}

	async list(): Promise<SkillInfo[]> {
		const candidates = await this.listCandidates(this.rootPath, 'list skills');
		const skills = await this.loadValidSkillRecords(candidates, false);
		this.logger.info(LOG_SOURCE, `Listed ${skills.length} skill(s)`, { rootPath: this.rootPath });
		return skills.map((skill) => skill.info);
	}

	async resolve(name: string): Promise<SkillInfo | undefined> {
		const skillName = this.requireSkillName(name);
		return (await this.list()).find((skill) => skill.name === skillName);
	}

	async search(query: string, options: SkillSearchOptions = {}): Promise<SkillSearchResult[]> {
		const skills = await this.list();
		if (skills.length === 0) return [];
		const configuredNames = new Set((options.names ?? []).map(normalizeSkillName).filter(Boolean));
		const queryTokens = tokenize(query);
		const limit = normalizeSearchLimit(options.limit);
		const results = skills
			.map((skill) => scoreSkill(skill, queryTokens, configuredNames))
			.filter((result): result is SkillSearchResult => result !== null)
			.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
			.slice(0, limit);
		this.logger.info(LOG_SOURCE, 'Searched ' + skills.length + ' skill(s)', {
			queryLength: query.trim().length,
			configuredCount: configuredNames.size,
			matched: results.length,
		});
		return results;
	}

	async load(name: string): Promise<SkillDetails> {
		const skillName = this.requireSkillName(name);
		const folderPath = path.join(this.rootPath, skillName);
		const parsed = await this.parseSkillFolder({ folderPath, folderName: skillName }, true);
		if (!parsed) {
			throw new SkillsServiceError('not-found', `Skill "${skillName}" is not installed.`);
		}

		this.logger.info(LOG_SOURCE, `Loaded skill "${skillName}"`, { location: parsed.info.location });
		return {
			...parsed.info,
			frontmatter: parsed.frontmatter,
			instructions: parsed.instructions ?? '',
			supportFiles: await this.listSupportFiles(skillName),
		};
	}

	async listSupportFiles(name: string): Promise<SkillSupportFile[]> {
		const skillName = this.requireSkillName(name);
		const location = path.join(this.rootPath, skillName);
		try {
			return await this.enumerateSupportFiles(location);
		} catch (error) {
			const message = this.safeErrorMessage(error);
			this.logger.error(LOG_SOURCE, `Failed to list support files for skill "${skillName}"`, {
				location,
				reason: message,
			});
			throw new SkillsServiceError(
				'filesystem',
				`Failed to list support files for skill "${skillName}": ${message}`
			);
		}
	}

	async validateSkillFolder(sourcePath: string): Promise<SkillValidationResult> {
		const folderPath = this.resolveExternalPath(sourcePath, 'Skill folder');
		const result = await this.validateCandidate({
			folderPath,
			folderName: path.basename(folderPath),
		});

		if (!result.valid) {
			this.logger.warn(LOG_SOURCE, 'Skill validation failed', { folderPath, issues: result.issues });
		}

		return result;
	}

	async importSkill(sourcePath: string, options: SkillWriteOptions = {}): Promise<SkillImportResult> {
		const source = this.resolveExternalPath(sourcePath, 'Skill import source');

		try {
			const candidates = await this.collectImportCandidates(source);
			const result: SkillImportResult = { imported: [], skipped: [] };
			await fs.mkdir(this.rootPath, { recursive: true });

			for (const candidate of candidates) {
				const parsed = await this.parseSkillFolder(candidate, false);
				if (!parsed) {
					result.skipped.push({
						name: candidate.folderName,
						sourcePath: candidate.folderPath,
						reason: `${SKILL_FILE_NAME} is missing or invalid.`,
					});
					this.logger.warn(LOG_SOURCE, 'Skipped skill import', result.skipped.at(-1));
					continue;
				}

				const destinationPath = path.join(this.rootPath, parsed.info.name);
				if (!samePath(candidate.folderPath, destinationPath)) {
					if (await this.pathExists(destinationPath)) {
						if (!options.replace) {
							result.skipped.push({
								name: parsed.info.name,
								sourcePath: candidate.folderPath,
								reason: 'Skill is already installed.',
							});
							this.logger.warn(LOG_SOURCE, 'Skipped skill import', result.skipped.at(-1));
							continue;
						}
						await fs.rm(destinationPath, { recursive: true, force: true });
					}

					await fs.cp(candidate.folderPath, destinationPath, { recursive: true });
				}

				const imported = await this.parseSkillFolder(
					{ folderPath: destinationPath, folderName: parsed.info.name },
					false
				);
				if (imported) result.imported.push(imported.info);
				this.logger.info(LOG_SOURCE, `Imported skill "${parsed.info.name}"`, {
					sourcePath: candidate.folderPath,
					destinationPath,
					replaced: options.replace === true,
				});
			}

			return result;
		} catch (error) {
			const message = this.safeErrorMessage(error);
			this.logger.error(LOG_SOURCE, 'Failed to import skills', { sourcePath: source, reason: message });
			if (error instanceof SkillsServiceError) throw error;
			throw new SkillsServiceError('filesystem', `Failed to import skills from "${source}": ${message}`);
		}
	}

	async downloadSkill(
		name: string,
		destinationRoot: string,
		options: SkillWriteOptions = {}
	): Promise<SkillDownloadResult> {
		const skillName = this.requireSkillName(name);
		const destinationParent = this.resolveExternalPath(
			destinationRoot,
			'Skill download destination'
		);

		try {
			const skill = await this.load(skillName);
			const destinationPath = path.join(destinationParent, skill.name);
			if (samePath(skill.location, destinationPath)) {
				throw new SkillsServiceError(
					'invalid-input',
					'Skill download destination must be outside the installed skill folder.'
				);
			}
			if ((await this.pathExists(destinationPath)) && !options.replace) {
				throw new SkillsServiceError(
					'already-exists',
					`Skill download destination already exists: "${destinationPath}".`
				);
			}

			await fs.mkdir(destinationParent, { recursive: true });
			if (options.replace) await fs.rm(destinationPath, { recursive: true, force: true });
			await fs.cp(skill.location, destinationPath, { recursive: true });
			this.logger.info(LOG_SOURCE, `Downloaded skill "${skill.name}"`, { destinationPath });
			return { id: skill.id, name: skill.name, destinationPath };
		} catch (error) {
			const message = this.safeErrorMessage(error);
			this.logger.error(LOG_SOURCE, `Failed to download skill "${skillName}"`, {
				destinationRoot,
				reason: message,
			});
			if (error instanceof SkillsServiceError) throw error;
			throw new SkillsServiceError(
				'filesystem',
				`Failed to download skill "${skillName}": ${message}`
			);
		}
	}

	async deleteSkill(name: string): Promise<{ id: string; name: string; deleted: boolean }> {
		const skillName = this.requireSkillName(name);
		const folderPath = path.join(this.rootPath, skillName);

		try {
			const skill = await this.resolve(skillName);
			if (!skill) {
				this.logger.info(LOG_SOURCE, `Skill "${skillName}" was already missing`, { folderPath });
				return { id: skillName, name: skillName, deleted: false };
			}

			await fs.rm(skill.location, { recursive: true, force: true });
			this.logger.info(LOG_SOURCE, `Deleted skill "${skill.name}"`, { location: skill.location });
			return { id: skill.id, name: skill.name, deleted: true };
		} catch (error) {
			const message = this.safeErrorMessage(error);
			this.logger.error(LOG_SOURCE, `Failed to delete skill "${skillName}"`, {
				folderPath,
				reason: message,
			});
			if (error instanceof SkillsServiceError) throw error;
			throw new SkillsServiceError('filesystem', `Failed to delete skill "${skillName}": ${message}`);
		}
	}

	private async listCandidates(rootPath: string, operation: string): Promise<SkillCandidate[]> {
		try {
			const entries = await fs.readdir(rootPath, { withFileTypes: true });
			return entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => ({
					folderPath: path.join(rootPath, entry.name),
					folderName: entry.name,
				}))
				.sort((a, b) => a.folderName.localeCompare(b.folderName));
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === 'ENOENT') return [];
			const message = this.safeErrorMessage(error);
			this.logger.error(LOG_SOURCE, `Failed to ${operation}`, { rootPath, reason: message });
			throw new SkillsServiceError('filesystem', `Failed to ${operation}: ${message}`);
		}
	}

	private async loadValidSkillRecords(
		candidates: SkillCandidate[],
		includeInstructions: boolean
	): Promise<ParsedSkill[]> {
		const byName = new Map<string, ParsedSkill>();

		for (const candidate of candidates) {
			if (!(await this.hasSkillFile(candidate.folderPath))) continue;
			const parsed = await this.parseSkillFolder(candidate, includeInstructions);
			if (!parsed) continue;
			if (byName.has(parsed.info.name)) {
				this.logger.warn(LOG_SOURCE, `Skipped duplicate skill "${parsed.info.name}"`, {
					location: parsed.info.location,
					selectedLocation: byName.get(parsed.info.name)?.info.location,
				});
				continue;
			}
			byName.set(parsed.info.name, parsed);
		}

		return [...byName.values()].sort((a, b) => a.info.name.localeCompare(b.info.name));
	}

	private async collectImportCandidates(sourcePath: string): Promise<SkillCandidate[]> {
		let stat;
		try {
			stat = await fs.stat(sourcePath);
		} catch (error) {
			const message = this.safeErrorMessage(error);
			throw new SkillsServiceError(
				'filesystem',
				`Failed to read skill import source "${sourcePath}": ${message}`
			);
		}

		if (!stat.isDirectory()) {
			throw new SkillsServiceError(
				'invalid-input',
				`Skill import source must be a directory: "${sourcePath}".`
			);
		}

		if (await this.hasSkillFile(sourcePath)) {
			return [{ folderPath: sourcePath, folderName: path.basename(sourcePath) }];
		}

		return this.listCandidates(sourcePath, 'inspect skill import source');
	}

	private async parseSkillFolder(
		candidate: SkillCandidate,
		includeInstructions: boolean
	): Promise<ParsedSkill | null> {
		const validation = await this.validateCandidate(candidate, includeInstructions);
		if (!validation.valid) {
			this.logger.warn(LOG_SOURCE, 'Skipped invalid skill', {
				folderPath: candidate.folderPath,
				issues: validation.issues,
			});
			return null;
		}

		return validation.skill;
	}

	private async validateCandidate(
		candidate: SkillCandidate,
		includeInstructions = false
	): Promise<SkillValidationResult> {
		const skillPath = path.join(candidate.folderPath, SKILL_FILE_NAME);
		const issues: SkillValidationIssue[] = [];
		let parsed: matter.GrayMatterFile<string>;

		try {
			const content = includeInstructions
				? await fs.readFile(skillPath, 'utf8')
				: await this.readFrontmatter(skillPath);
			parsed = matter(content);
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === 'ENOENT') {
				return {
					valid: false,
					issues: [this.issue('missing-skill-file', `${SKILL_FILE_NAME} is required.`)],
				};
			}

			return {
				valid: false,
				issues: [
					this.issue(
						'invalid-skill-file',
						`Failed to parse ${SKILL_FILE_NAME}: ${this.safeErrorMessage(error)}`
					),
				],
			};
		}

		const data = isRecord(parsed.data) ? parsed.data : {};
		const name = readString(data.name);
		const description = readString(data.description);
		const nameIssue = this.validateName(name, candidate.folderName);
		if (nameIssue) issues.push(nameIssue);
		if (!description) {
			issues.push(this.issue('invalid-description', 'Skill description is required.'));
		} else if (description.length > 1024) {
			issues.push(
				this.issue('invalid-description', 'Skill description must be 1024 characters or fewer.')
			);
		}

		if (issues.length > 0 || !name || !description) {
			return { valid: false, issues };
		}

		const frontmatter: SkillFrontmatter = { name, description };
		assignString(frontmatter, 'license', data.license);
		assignString(frontmatter, 'compatibility', data.compatibility);
		if (isRecord(data.metadata)) frontmatter.metadata = data.metadata;
		const allowedTools = this.readAllowedTools(data['allowed-tools']);
		if (allowedTools.length > 0) frontmatter.allowedTools = allowedTools;

		return {
			valid: true,
			issues: [],
			skill: {
				info: {
					id: name,
					name,
					description,
					location: candidate.folderPath,
				},
				frontmatter,
				...(includeInstructions ? { instructions: parsed.content } : {}),
			},
		};
	}

	private async readFrontmatter(skillPath: string): Promise<string> {
		const handle = await fs.open(skillPath, 'r');
		const buffer = Buffer.alloc(4096);
		let content = '';

		try {
			while (Buffer.byteLength(content, 'utf8') <= MAX_FRONTMATTER_BYTES) {
				const read = await handle.read(buffer, 0, buffer.length, null);
				if (read.bytesRead === 0) break;
				content += buffer.subarray(0, read.bytesRead).toString('utf8');
				const endIndex = findFrontmatterEnd(content);
				if (endIndex !== -1) return content.slice(0, endIndex);
			}
		} finally {
			await handle.close();
		}

		throw new Error(`${SKILL_FILE_NAME} frontmatter is missing or too large.`);
	}

	private validateName(name: string | undefined, folderName: string): SkillValidationIssue | undefined {
		if (!name) return this.issue('invalid-name', 'Skill name is required.');
		if (name.length > 64) {
			return this.issue('invalid-name', 'Skill name must be 64 characters or fewer.');
		}
		if (!SKILL_NAME_PATTERN.test(name)) {
			return this.issue(
				'invalid-name',
				'Skill name must use lowercase letters, numbers, and single hyphens.'
			);
		}
		if (name !== folderName) {
			return this.issue('invalid-name', 'Skill name must match the parent folder name.');
		}
		return undefined;
	}

	private async enumerateSupportFiles(folderPath: string): Promise<SkillSupportFile[]> {
		const files: SkillSupportFile[] = [];

		for (const directory of SUPPORT_DIRECTORIES) {
			const root = path.join(folderPath, directory);
			if (!(await this.pathExists(root))) continue;
			await this.walkSupportFiles(folderPath, root, files);
		}

		return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
	}

	private async walkSupportFiles(
		skillRoot: string,
		currentPath: string,
		files: SkillSupportFile[]
	): Promise<void> {
		const entries = await fs.readdir(currentPath, { withFileTypes: true });
		for (const entry of entries) {
			const entryPath = path.join(currentPath, entry.name);
			if (entry.isDirectory()) {
				await this.walkSupportFiles(skillRoot, entryPath, files);
			} else if (entry.isFile()) {
				const stat = await fs.stat(entryPath);
				const relativePath = toRelativeSkillPath(skillRoot, entryPath);
				files.push({
					relativePath,
					kind: supportKind(relativePath),
					size: stat.size,
				});
			}
		}
	}

	private readAllowedTools(value: unknown): string[] {
		if (typeof value === 'string') return value.split(/\s+/).map((item) => item.trim()).filter(Boolean);
		if (!Array.isArray(value)) return [];
		return value.map(readString).filter((item): item is string => item !== undefined);
	}

	private requireSkillName(value: string): string {
		const name = readString(value);
		if (!name || !SKILL_NAME_PATTERN.test(name)) {
			throw new SkillsServiceError('invalid-input', 'Skill name is invalid.');
		}
		return name;
	}

	private resolveExternalPath(value: string, label: string): string {
		if (typeof value !== 'string' || value.trim() === '') {
			throw new SkillsServiceError('invalid-input', `${label} is required.`);
		}
		return path.resolve(value);
	}

	private async hasSkillFile(folderPath: string): Promise<boolean> {
		try {
			const stat = await fs.stat(path.join(folderPath, SKILL_FILE_NAME));
			return stat.isFile();
		} catch {
			return false;
		}
	}

	private async pathExists(targetPath: string): Promise<boolean> {
		try {
			await fs.access(targetPath);
			return true;
		} catch {
			return false;
		}
	}

	private issue(code: string, message: string): SkillValidationIssue {
		return { code, message };
	}

	private safeErrorMessage(error: unknown): string {
		if (error instanceof SkillsServiceError) return error.message;
		if (error instanceof Error && error.message.trim()) return error.message;
		return String(error);
	}
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function assignString<K extends keyof SkillFrontmatter>(
	target: SkillFrontmatter,
	key: K,
	value: unknown
): void {
	const text = readString(value);
	if (text) (target as unknown as Record<string, unknown>)[key] = text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function samePath(a: string, b: string): boolean {
	return path.resolve(a) === path.resolve(b);
}

function findFrontmatterEnd(content: string): number {
	const openerLength = content.startsWith('---\r\n') ? 5 : content.startsWith('---\n') ? 4 : -1;
	if (openerLength === -1) return -1;
	const match = /\r?\n---(?:\r?\n|$)/.exec(content.slice(openerLength));
	return match ? openerLength + match.index + match[0].length : -1;
}

function toRelativeSkillPath(skillRoot: string, filePath: string): string {
	return path.relative(skillRoot, filePath).split(path.sep).join('/');
}

function supportKind(relativePath: string): SkillSupportFile['kind'] {
	if (relativePath.startsWith('scripts/')) return 'script';
	if (relativePath.startsWith('references/')) return 'reference';
	if (relativePath.startsWith('assets/')) return 'asset';
	return 'file';
}

function normalizeSearchLimit(value: number | undefined): number {
	if (value === undefined) return DEFAULT_SKILL_SEARCH_LIMIT;
	if (!Number.isFinite(value)) return DEFAULT_SKILL_SEARCH_LIMIT;
	return Math.max(0, Math.min(MAX_SKILL_SEARCH_LIMIT, Math.floor(value)));
}

function normalizeSkillName(value: string): string {
	return value.trim().toLowerCase();
}

function tokenize(value: string): string[] {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
	if (!normalized) return [];
	return Array.from(new Set(normalized.split(/\s+/).filter((token) => token.length >= 3 && !SKILL_SEARCH_STOP_WORDS.has(token))));
}

function scoreSkill(
	skill: SkillInfo,
	queryTokens: readonly string[],
	configuredNames: ReadonlySet<string>
): SkillSearchResult | null {
	const normalizedName = normalizeSkillName(skill.name);
	if (configuredNames.has(normalizedName)) {
		return { ...skill, score: 1000, reason: 'configured for this agent' };
	}
	if (queryTokens.length === 0) return null;

	const nameTokens = tokenize(skill.name);
	const descriptionTokens = tokenize(skill.description);
	let score = 0;
	let matchedName = 0;
	let matchedDescription = 0;
	for (const token of queryTokens) {
		if (nameTokens.some((nameToken) => nameToken === token || nameToken.includes(token) || token.includes(nameToken))) {
			score += 12;
			matchedName++;
		} else if (descriptionTokens.some((descriptionToken) => descriptionToken === token || descriptionToken.includes(token))) {
			score += 4;
			matchedDescription++;
		}
	}
	if (score === 0) return null;
	const reason = matchedName > 0
		? 'matched skill name'
		: matchedDescription > 0
			? 'matched skill description'
			: 'matched skill metadata';
	return { ...skill, score, reason };
}
