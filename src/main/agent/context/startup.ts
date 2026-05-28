import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveDefaultUserDataPath } from '../../user-data';
import type { AgentTool } from '../capabilities/local/types';
import { jsonResult, textResult } from '../capabilities/local/types';

export const DEFAULT_AGENTS_FILENAME = 'AGENTS.md';
export const DEFAULT_SOUL_FILENAME = 'SOUL.md';
export const DEFAULT_IDENTITY_FILENAME = 'IDENTITY.md';
export const DEFAULT_USER_FILENAME = 'USER.md';
export const DEFAULT_HEARTBEAT_FILENAME = 'HEARTBEAT.md';
export const DEFAULT_BOOTSTRAP_FILENAME = 'BOOTSTRAP.md';
export const DEFAULT_MEMORY_FILENAME = 'MEMORY.md';

export const WORKSPACE_CONTEXT_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_MEMORY_FILENAME,
] as const;

export type WorkspaceFileName = (typeof WORKSPACE_CONTEXT_FILE_NAMES)[number];
export type BootstrapMode = 'none' | 'limited' | 'full';
export interface WorkspaceContextFile {
	name: WorkspaceFileName;
	path: string;
	content?: string;
	missing: boolean;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
}
export interface WorkspaceFileSummary {
	name: WorkspaceFileName;
	path: string;
	missing: boolean;
	size?: number;
}
export interface AgentStartupFilesServicePort {
	getRootPath(agentId: string): string;
	ensureReady(agentId: string): Promise<void>;
	isBootstrapPending(agentId: string): Promise<boolean>;
	loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]>;
	listFiles(agentId: string): Promise<WorkspaceFileSummary[]>;
	readFile(agentId: string, name: string): Promise<WorkspaceContextFile>;
	writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile>;
	deleteFile(agentId: string, name: string): Promise<WorkspaceContextFile>;
	resetFiles(agentId: string): Promise<WorkspaceFileSummary[]>;
	completeBootstrap(agentId: string): Promise<WorkspaceContextFile>;
}

const names = new Set<string>(WORKSPACE_CONTEXT_FILE_NAMES);
const defaults: Record<WorkspaceFileName, string> = {
	[DEFAULT_AGENTS_FILENAME]: '# Agent Instructions\n\nThis file contains persistent startup context for the Friday agent.\n',
	[DEFAULT_SOUL_FILENAME]: '# Soul\n\nDescribe the agent persona, tone, values, and boundaries here.\n',
	[DEFAULT_IDENTITY_FILENAME]: [
		'# IDENTITY.md - Who Am I?',
		'',
		'_Fill this in during your first conversation. Make it yours._',
		'',
		'- **Name:**',
		'- **Nature:**',
		'- **Vibe:**',
		'- **Emoji:**',
		'- **Avatar:**',
	].join('\n'),
	[DEFAULT_USER_FILENAME]: [
		'# USER.md - About Your Human',
		'',
		'_Learn about the person you are helping. Update this as you go._',
		'',
		'- **Name:**',
		'- **What to call them:**',
		'- **Pronouns:**',
		'- **Timezone:**',
		'- **Notes:**',
		'',
		'## Context',
		'',
		'Add projects, preferences, and durable context here over time.',
	].join('\n'),
	[DEFAULT_HEARTBEAT_FILENAME]: '# Heartbeat\n\nKeep scheduled-check guidance short and concrete.\n',
	[DEFAULT_BOOTSTRAP_FILENAME]: [
		'# BOOTSTRAP.md - Hello, World',
		'',
		'_You just woke up. Time to figure out who you are._',
		'',
		'There is no memory yet. This is a fresh workspace, so it is normal that memory files do not exist until you create them.',
		'',
		'## The Conversation',
		'',
		'Do not interrogate. Do not be robotic. Just talk.',
		'',
		'Start with something like:',
		'',
		'> "Hey. I just came online. Who am I? Who are you?"',
		'',
		'Then figure out together:',
		'',
		'1. **Your name** - What should they call you?',
		'2. **Your nature** - AI assistant is fine, but make it feel specific.',
		'3. **Your vibe** - Formal? Casual? Sharp? Warm? What feels right?',
		'4. **Your emoji** - A small signature.',
		'',
		'Offer suggestions if they are stuck. Keep it short and conversational.',
		'',
		'## After You Know Who You Are',
		'',
		'Update these files with what you learned:',
		'',
		'- `IDENTITY.md` - your name, nature, vibe, emoji, and avatar if one exists',
		'- `USER.md` - their name, how to address them, timezone, notes',
		'',
		'Then open `SOUL.md` together and talk about:',
		'',
		'- What matters to them',
		'- How they want you to behave',
		'- Any boundaries or preferences',
		'',
		'Write it down. Make it real.',
		'',
		'## Connect (Optional)',
		'',
		'Ask how they want to reach you:',
		'',
		'- **Just here** - Friday chat only',
		'- **Channels** - connect messaging channels from Settings when they are ready',
		'',
		'## When You Are Done',
		'',
		'Use the internal `startup_files` tool to write `IDENTITY.md`, `USER.md`, and `SOUL.md`, then call `startup_files` with `operation: "complete_bootstrap"`.',
		'',
		'You do not need a bootstrap script anymore once you are you.',
	].join('\n'),
	[DEFAULT_MEMORY_FILENAME]: '# Memory\n\nCurated long-term memory belongs here when needed.\n',
};
const STATE_DIR = '.friday';
const STATE_FILENAME = 'startup-state.json';
type StartupState = { bootstrapSeededAt?: string; setupCompletedAt?: string };

export function assertWorkspaceFileName(name: string): asserts name is WorkspaceFileName {
	if (!names.has(name)) throw new Error(`Unsupported startup file: ${name}`);
}

export function resolveBootstrapMode(files: WorkspaceContextFile[]): BootstrapMode {
	if (files.some((file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing)) return 'full';
	return 'none';
}

export class AgentStartupFilesService implements AgentStartupFilesServicePort {
	private readonly rootPath: string;

	constructor(options: { rootPath?: string; logger?: unknown } = {}) {
		this.rootPath = options.rootPath ?? resolveDefaultUserDataPath('agent', 'workspaces');
	}

	getRootPath(agentId: string): string {
		return path.join(this.rootPath, encodeURIComponent(agentId || 'main'));
	}

	async ensureReady(agentId: string): Promise<void> {
		const root = this.getRootPath(agentId);
		await fs.mkdir(root, { recursive: true, mode: 0o700 });
		await fs.mkdir(path.join(root, STATE_DIR), { recursive: true, mode: 0o700 });
		const state = await this.readState(root);
		const existing = await this.existingCanonicalFiles(root);
		const hasProfile = existing.some((name) => name !== DEFAULT_BOOTSTRAP_FILENAME && name !== DEFAULT_MEMORY_FILENAME);

		if (!state.bootstrapSeededAt && !state.setupCompletedAt && hasProfile) {
			await this.writeState(root, { ...state, setupCompletedAt: new Date().toISOString() });
		} else if (!state.bootstrapSeededAt && !state.setupCompletedAt) {
			const nextState = { ...state, bootstrapSeededAt: new Date().toISOString() };
			await Promise.all(WORKSPACE_CONTEXT_FILE_NAMES.filter((name) => name !== DEFAULT_MEMORY_FILENAME).map((name) => this.seedFile(root, name)));
			await this.writeState(root, nextState);
		} else {
			await Promise.all(WORKSPACE_CONTEXT_FILE_NAMES.filter((name) => name !== DEFAULT_MEMORY_FILENAME && name !== DEFAULT_BOOTSTRAP_FILENAME).map((name) => this.seedFile(root, name)));
		}

		const nextState = await this.readState(root);
		if (nextState.bootstrapSeededAt && !nextState.setupCompletedAt) {
			const bootstrapPath = path.join(root, DEFAULT_BOOTSTRAP_FILENAME);
			const bootstrapExists = await exists(bootstrapPath);
			if (!bootstrapExists || await this.hasCustomizedProfile(root)) {
				await fs.rm(bootstrapPath, { force: true });
				await this.writeState(root, { ...nextState, setupCompletedAt: new Date().toISOString() });
			}
		}
	}

	async isBootstrapPending(agentId: string): Promise<boolean> {
		const file = await this.readFile(agentId, DEFAULT_BOOTSTRAP_FILENAME);
		return !file.missing;
	}

	async loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]> {
		await this.ensureReady(agentId);
		return Promise.all(WORKSPACE_CONTEXT_FILE_NAMES.map((name) => this.readFile(agentId, name)));
	}

	async listFiles(agentId: string): Promise<WorkspaceFileSummary[]> {
		await this.ensureReady(agentId);
		return Promise.all(WORKSPACE_CONTEXT_FILE_NAMES.map(async (name) => {
			const file = path.join(this.getRootPath(agentId), name);
			const stat = await fs.stat(file).catch(() => undefined);
			return { name, path: file, missing: !stat, ...(stat ? { size: stat.size } : {}) };
		}));
	}

	async readFile(agentId: string, name: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		const file = path.join(this.getRootPath(agentId), name);
		try {
			const stat = await fs.lstat(file);
			if (stat.isSymbolicLink()) return { name, path: file, missing: true, error: 'unsafe' };
			const [rootReal, fileReal] = await Promise.all([fs.realpath(this.getRootPath(agentId)), fs.realpath(file)]);
			if (!isInside(rootReal, fileReal) || fileReal !== path.join(rootReal, name)) {
				return { name, path: file, missing: true, error: 'unsafe' };
			}
			return { name, path: file, missing: false, content: await fs.readFile(file, 'utf8') };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { name, path: file, missing: true, error: 'missing' };
			return { name, path: file, missing: true, error: 'io', detail: error instanceof Error ? error.message : String(error) };
		}
	}

	async writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		await this.ensureReady(agentId);
		const file = path.join(this.getRootPath(agentId), name);
		await fs.writeFile(file, content, 'utf8');
		return this.readFile(agentId, name);
	}

	async deleteFile(agentId: string, name: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		await fs.rm(path.join(this.getRootPath(agentId), name), { force: true });
		return this.readFile(agentId, name);
	}

	async resetFiles(agentId: string): Promise<WorkspaceFileSummary[]> {
		await fs.rm(this.getRootPath(agentId), { recursive: true, force: true });
		await this.ensureReady(agentId);
		return this.listFiles(agentId);
	}

	async completeBootstrap(agentId: string): Promise<WorkspaceContextFile> {
		const root = this.getRootPath(agentId);
		await fs.rm(path.join(root, DEFAULT_BOOTSTRAP_FILENAME), { force: true });
		await this.writeState(root, { ...await this.readState(root), setupCompletedAt: new Date().toISOString() });
		return this.readFile(agentId, DEFAULT_BOOTSTRAP_FILENAME);
	}

	private async seedFile(root: string, name: WorkspaceFileName): Promise<void> {
		await fs.writeFile(path.join(root, name), defaults[name], { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
			if (error.code !== 'EEXIST') throw error;
		});
	}

	private async existingCanonicalFiles(root: string): Promise<WorkspaceFileName[]> {
		const out: WorkspaceFileName[] = [];
		for (const name of WORKSPACE_CONTEXT_FILE_NAMES) {
			if (await exists(path.join(root, name))) out.push(name);
		}
		return out;
	}

	private async hasCustomizedProfile(root: string): Promise<boolean> {
		for (const name of [DEFAULT_AGENTS_FILENAME, DEFAULT_SOUL_FILENAME, DEFAULT_IDENTITY_FILENAME, DEFAULT_USER_FILENAME, DEFAULT_HEARTBEAT_FILENAME] as const) {
			const content = await fs.readFile(path.join(root, name), 'utf8').catch(() => undefined);
			if (content !== undefined && content !== defaults[name]) return true;
		}
		return false;
	}

	private async readState(root: string): Promise<StartupState> {
		const content = await fs.readFile(path.join(root, STATE_DIR, STATE_FILENAME), 'utf8').catch(() => undefined);
		if (!content) return {};
		try {
			const parsed = JSON.parse(content) as StartupState;
			return parsed && typeof parsed === 'object' ? parsed : {};
		} catch {
			return {};
		}
	}

	private async writeState(root: string, state: StartupState): Promise<void> {
		await fs.mkdir(path.join(root, STATE_DIR), { recursive: true, mode: 0o700 });
		await fs.writeFile(path.join(root, STATE_DIR, STATE_FILENAME), JSON.stringify(state, null, 2), 'utf8');
	}
}

export function createStartupFilesTool(service: AgentStartupFilesServicePort, agentId: string): AgentTool {
	return {
		name: 'startup_files',
		displayName: 'Startup files',
		description: 'Internal tool for listing, reading, writing, deleting, resetting, and completing Friday startup markdown files.',
		schema: {
			type: 'object',
			required: ['operation'],
			properties: {
				operation: { type: 'string', enum: ['list', 'read', 'write', 'delete', 'reset', 'complete_bootstrap'] },
				name: { type: 'string' },
				content: { type: 'string' },
				files: { type: 'object', additionalProperties: { type: 'string' } },
			},
			additionalProperties: false,
		},
		async execute(args) {
			const operation = typeof args.operation === 'string' ? args.operation : '';
			if (operation === 'list') return jsonResult(await service.listFiles(agentId));
			if (operation === 'read') return jsonResult(await service.readFile(agentId, requiredName(args.name)));
			if (operation === 'delete') return jsonResult(await service.deleteFile(agentId, requiredName(args.name)));
			if (operation === 'reset') return jsonResult(await service.resetFiles(agentId));
			if (operation === 'complete_bootstrap') return jsonResult(await service.completeBootstrap(agentId));
			if (operation === 'write') {
				const files = args.files && typeof args.files === 'object' && !Array.isArray(args.files)
					? args.files as Record<string, unknown>
					: undefined;
				if (files) {
					const written: WorkspaceContextFile[] = [];
					for (const [name, content] of Object.entries(files)) {
						if (typeof content !== 'string') throw new Error(`content for ${name} must be a string.`);
						written.push(await service.writeFile(agentId, name, content));
					}
					return jsonResult(written);
				}
				if (typeof args.content !== 'string') throw new Error('content is required.');
				return jsonResult(await service.writeFile(agentId, requiredName(args.name), args.content));
			}
			return textResult(`Unsupported startup_files operation: ${operation}`, true);
		},
	};
}

function requiredName(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error('name is required.');
	return value;
}

async function exists(file: string): Promise<boolean> {
	return fs.access(file).then(() => true, () => false);
}

function isInside(root: string, target: string): boolean {
	const relative = path.relative(root, target);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
