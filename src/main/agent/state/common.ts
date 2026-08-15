import type { FileAccessContext, FileToolState } from './types';

import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';

export function fileToolState(
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string
): FileToolState | undefined {
	if (typeof args.path !== 'string' || args.path.length === 0) return undefined;
	const resolved = realPath(resolveUserPath(args.path, baseDir));
	return {
		toolName,
		path: resolved,
		directory: path.dirname(resolved),
	};
}

export function hasCreatedFile(
	context: FileAccessContext | undefined,
	filePath: string
): boolean {
	return context?.createdFiles.has(filePath) ?? false;
}

export function hasToolPermission(
	context: FileAccessContext | undefined,
	directory: string
): boolean {
	return context?.readDirectories.has(directory) ?? false;
}
