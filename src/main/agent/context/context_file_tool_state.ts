import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';
import type { ToolContextState } from './context_types';

export function fileToolState(
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string
): ToolContextState | undefined {
	if (typeof args.path !== 'string' || args.path.length === 0) return undefined;
	const resolved = realPath(resolveUserPath(args.path, baseDir));
	return {
		toolName,
		fileName: path.basename(resolved),
		path: resolved,
		folderPath: path.dirname(resolved),
	};
}
