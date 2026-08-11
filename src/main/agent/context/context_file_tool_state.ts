import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';
import type { FileToolState } from './context_types';

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
