import { createHash } from 'node:crypto';
import path from 'node:path';

export const WORKSPACE_MEMORY_DIR = 'memory';

const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function createSafeMemoryId(parts: readonly string[]): string {
	const raw = parts.map((part) => part.trim()).filter(Boolean).join(':');
	if (!raw) throw new Error('Memory scope id source is required.');
	const slug = raw
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^[._-]+|[._-]+$/g, '')
		.slice(0, 72) || 'scope';
	const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8);
	return `${slug}-${hash}`;
}

export function normalizeMemoryPathSegment(value: string, label = 'Memory path segment'): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${label} is required.`);
	return isSafeMemoryPathSegment(trimmed) ? trimmed : createSafeMemoryId([trimmed]);
}

export function isSafeMemoryPathSegment(value: string): boolean {
	return SAFE_SEGMENT_PATTERN.test(value) && value !== '.' && value !== '..';
}

export function relativeWorkspacePath(workspaceDir: string, filePath: string): string | undefined {
	const relativePath = path.relative(path.resolve(workspaceDir), path.resolve(filePath));
	return isUnsafeRelativePath(relativePath) ? undefined : relativePath;
}

export function splitRelativeMemoryPath(relativePath: string): string[] {
	return relativePath.split(/[\\/]+/).filter(Boolean);
}

export function isUnsafeRelativePath(relativePath: string): boolean {
	if (!relativePath || path.isAbsolute(relativePath)) return true;
	const parts = splitRelativeMemoryPath(relativePath);
	return parts.length === 0 || parts.includes('..');
}
