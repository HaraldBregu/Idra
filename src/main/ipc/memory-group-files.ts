import { promises as fs } from 'node:fs';
import path from 'node:path';

import { WorkspaceMemorySearchManager } from '../memory-runtime';
import type {
	MemoryFileSummary,
	MemoryReadRequest,
	MemoryReadResult,
	MemorySearchRequest,
	MemorySearchResult,
} from '../../shared/memory';

type MemoryGroupDescriptor = Pick<
	MemoryFileSummary,
	'corpus' | 'scopeKind' | 'scopeId' | 'relativePath'
>;

type DescribeMemoryFile = (
	workspaceRoot: string,
	filePath: string
) => MemoryGroupDescriptor | undefined;

export interface MemoryGroupOptions {
	workspaceRoot: string;
	rootRelativePath: string;
	label: string;
	describe: DescribeMemoryFile;
}

interface MemoryGroupRoot {
	absolute: string;
	real: string;
}

export async function listMemoryGroupFiles(options: MemoryGroupOptions): Promise<MemoryFileSummary[]> {
	const workspaceRoot = path.resolve(options.workspaceRoot);
	const root = await resolveExistingGroupRoot(workspaceRoot, options.rootRelativePath, options.label);
	if (!root) return [];

	const files = await listMarkdownFiles(root.absolute, root.real);
	const summaries: MemoryFileSummary[] = [];
	for (const file of files) {
		const descriptor = options.describe(workspaceRoot, file);
		if (!descriptor) continue;
		const stat = await fs.stat(file);
		summaries.push({
			path: file,
			relativePath: descriptor.relativePath,
			corpus: descriptor.corpus,
			scopeKind: descriptor.scopeKind,
			scopeId: descriptor.scopeId,
			size: stat.size,
			updatedAt: stat.mtime.toISOString(),
		});
	}
	return summaries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function readMemoryGroupFile(
	options: MemoryGroupOptions,
	rawRequest: unknown
): Promise<MemoryReadResult> {
	const request = parseMemoryReadRequest(rawRequest);
	const workspaceRoot = path.resolve(options.workspaceRoot);
	const absolutePath = await resolveGroupMarkdownPath(
		workspaceRoot,
		options.rootRelativePath,
		options.label,
		request.path
	);
	const descriptor = options.describe(workspaceRoot, absolutePath);
	if (!descriptor) throw new Error(`Memory path is outside ${options.label} memory.`);

	const manager = new WorkspaceMemorySearchManager({
		workspaceDir: workspaceRoot,
		includeSessions: false,
	});
	return manager.readFile(absolutePath, {
		from: request.from,
		lines: request.lines,
		maxChars: request.maxChars,
	});
}

export async function searchMemoryGroupFiles(options: {
	workspaceRoot: string;
	request: unknown;
	corpus: 'memory' | 'rag' | 'wiki';
	scopeKind?: 'global' | 'chat';
	scopeId?: string;
}): Promise<MemorySearchResult[]> {
	const request = parseMemorySearchRequest(options.request);
	const manager = new WorkspaceMemorySearchManager({
		workspaceDir: path.resolve(options.workspaceRoot),
		includeSessions: false,
	});
	return manager.search(request.query, {
		source: 'memory',
		corpus: options.corpus,
		scopeKind: options.scopeKind,
		scopeId: options.scopeId ?? request.scopeId,
		maxResults: request.maxResults,
		minScore: request.minScore,
	});
}

export function parseChatMemoryListRequest(rawRequest: unknown): { scopeId?: string } {
	if (rawRequest === undefined) return {};
	const request = assertRecord(rawRequest, 'Chat memory list request');
	const scopeId = readOptionalString(request, 'scopeId', 'Chat memory scope id');
	return scopeId ? { scopeId } : {};
}

function parseMemorySearchRequest(rawRequest: unknown): MemorySearchRequest {
	const request = assertRecord(rawRequest, 'Memory search request');
	const query = readRequiredString(request, 'query', 'Memory search query');
	const maxResults = readOptionalPositiveNumber(request, 'maxResults', 'Memory search maxResults');
	const minScore = readOptionalMinimumNumber(request, 'minScore', 'Memory search minScore', 0);
	const scopeId = readOptionalString(request, 'scopeId', 'Memory search scope id');
	return {
		query,
		...(maxResults === undefined ? {} : { maxResults }),
		...(minScore === undefined ? {} : { minScore }),
		...(scopeId ? { scopeId } : {}),
	};
}

function parseMemoryReadRequest(rawRequest: unknown): MemoryReadRequest {
	const request = assertRecord(rawRequest, 'Memory read request');
	const filePath = readRequiredString(request, 'path', 'Memory read path');
	if (filePath.includes('\0')) throw new Error('Memory read path is invalid.');
	const from = readOptionalPositiveNumber(request, 'from', 'Memory read from');
	const lines = readOptionalPositiveNumber(request, 'lines', 'Memory read lines');
	const maxChars = readOptionalPositiveNumber(request, 'maxChars', 'Memory read maxChars');
	return {
		path: filePath,
		...(from === undefined ? {} : { from }),
		...(lines === undefined ? {} : { lines }),
		...(maxChars === undefined ? {} : { maxChars }),
	};
}

async function resolveExistingGroupRoot(
	workspaceRoot: string,
	rootRelativePath: string,
	label: string
): Promise<MemoryGroupRoot | undefined> {
	const rootAbsolute = path.resolve(workspaceRoot, rootRelativePath);
	if (!isInside(workspaceRoot, rootAbsolute)) {
		throw new Error(`${label} memory root must stay inside the workspace.`);
	}

	let stat;
	try {
		stat = await fs.stat(rootAbsolute);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
		throw error;
	}
	if (!stat.isDirectory()) throw new Error(`${label} memory root is not a directory.`);

	const workspaceReal = await fs.realpath(workspaceRoot).catch(() => workspaceRoot);
	const rootReal = await fs.realpath(rootAbsolute);
	if (!isInside(workspaceReal, rootReal)) {
		throw new Error(`${label} memory root must stay inside the workspace.`);
	}
	return { absolute: rootAbsolute, real: rootReal };
}

async function resolveGroupMarkdownPath(
	workspaceRoot: string,
	rootRelativePath: string,
	label: string,
	requestedPath: string
): Promise<string> {
	const root = await resolveExistingGroupRoot(workspaceRoot, rootRelativePath, label);
	if (!root) throw new Error(`${label} memory root does not exist.`);

	const absolutePath = path.isAbsolute(requestedPath)
		? path.resolve(requestedPath)
		: path.resolve(workspaceRoot, requestedPath);
	if (!isInside(root.absolute, absolutePath)) {
		throw new Error(`Memory path is outside ${label} memory root.`);
	}
	if (path.extname(absolutePath).toLowerCase() !== '.md') {
		throw new Error('Memory path must be Markdown.');
	}

	const stat = await fs.stat(absolutePath);
	if (!stat.isFile()) throw new Error('Memory path is not a file.');
	const realPath = await fs.realpath(absolutePath);
	if (!isInside(root.real, realPath)) {
		throw new Error(`Memory path is outside ${label} memory root.`);
	}
	return absolutePath;
}

async function listMarkdownFiles(rootAbsolute: string, rootReal: string): Promise<string[]> {
	const files: string[] = [];
	const visitedDirectories = new Set<string>();
	await walkMarkdownFiles(rootAbsolute, rootReal, visitedDirectories, files);
	return files;
}

async function walkMarkdownFiles(
	directory: string,
	rootReal: string,
	visitedDirectories: Set<string>,
	files: string[]
): Promise<void> {
	const directoryReal = await fs.realpath(directory);
	if (!isInside(rootReal, directoryReal) || visitedDirectories.has(directoryReal)) return;
	visitedDirectories.add(directoryReal);

	const entries = await fs.readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name);
		let stat;
		try {
			stat = await fs.stat(absolutePath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
			throw error;
		}

		if (stat.isDirectory()) {
			await walkMarkdownFiles(absolutePath, rootReal, visitedDirectories, files);
			continue;
		}
		if (!stat.isFile() || path.extname(absolutePath).toLowerCase() !== '.md') continue;
		const realPath = await fs.realpath(absolutePath);
		if (isInside(rootReal, realPath)) files.push(absolutePath);
	}
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(`${label} is required.`);
	}
	return value as Record<string, unknown>;
}

function readRequiredString(
	value: Record<string, unknown>,
	key: string,
	label: string
): string {
	const raw = value[key];
	if (typeof raw !== 'string' || !raw.trim()) throw new Error(`${label} is required.`);
	return raw.trim();
}

function readOptionalString(
	value: Record<string, unknown>,
	key: string,
	label: string
): string | undefined {
	const raw = value[key];
	if (raw === undefined) return undefined;
	if (typeof raw !== 'string') throw new Error(`${label} must be a string.`);
	const trimmed = raw.trim();
	return trimmed || undefined;
}

function readOptionalPositiveNumber(
	value: Record<string, unknown>,
	key: string,
	label: string
): number | undefined {
	return readOptionalMinimumNumber(value, key, label, 1);
}

function readOptionalMinimumNumber(
	value: Record<string, unknown>,
	key: string,
	label: string,
	minimum: number
): number | undefined {
	const raw = value[key];
	if (raw === undefined) return undefined;
	if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < minimum) {
		throw new Error(`${label} must be at least ${minimum}.`);
	}
	return raw;
}

function isInside(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
