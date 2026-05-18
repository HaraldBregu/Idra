import { promises as fs } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from './types';
import { textResult } from './types';
import { TOOL_LIMITS } from './limits';

interface WorkspaceEntry {
	name: string;
	path: string;
	type: 'directory' | 'file' | 'other';
}

interface ListArgs {
	path?: string;
	maxDepth?: number;
	limit?: number;
}

const DEFAULT_DEPTH = TOOL_LIMITS.workspaceList.defaultDepth;
const DEFAULT_LIMIT = TOOL_LIMITS.workspaceList.defaultLimit;

function entryType(e: Dirent): WorkspaceEntry['type'] {
	if (e.isDirectory()) return 'directory';
	if (e.isFile()) return 'file';
	return 'other';
}

export const getWorkspaceContentTool: AgentTool<ListArgs> = {
	name: 'get_workspace_content',
	description: 'List files and folders under the workspace.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			maxDepth: { type: 'number' },
			limit: { type: 'number' },
		},
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const ws = ctx.services.workspace;
		const rel = typeof args.path === 'string' ? args.path.trim() : '';
		const depth =
			typeof args.maxDepth === 'number' && args.maxDepth >= 0
				? Math.min(Math.floor(args.maxDepth), TOOL_LIMITS.workspaceList.maxDepth)
				: DEFAULT_DEPTH;
		const limit =
			typeof args.limit === 'number' && args.limit > 0
				? Math.min(Math.floor(args.limit), TOOL_LIMITS.workspaceList.maxLimit)
				: DEFAULT_LIMIT;
		const root = ws.resolvePath(rel);
		try {
			await ws.ensureReady();
			const stat = await fs.stat(root);
			if (!stat.isDirectory()) return textResult(`not a directory: ${rel || '.'}`, true);
			const entries: WorkspaceEntry[] = [];
			await collect(root, rel, depth, limit, entries);
			return textResult(
				JSON.stringify(
					{
						rootPath: ws.getRootPath(),
						path: rel || '.',
						entries,
						truncated: entries.length >= limit,
					},
					null,
					2
				)
			);
		} catch (err) {
			return textResult(`get_workspace_content: ${(err as Error).message}`, true);
		}
	},
};

async function collect(
	abs: string,
	rel: string,
	depth: number,
	limit: number,
	out: WorkspaceEntry[]
): Promise<void> {
	if (out.length >= limit) return;
	const dirents = await fs.readdir(abs, { withFileTypes: true });
	for (const dirent of dirents) {
		if (out.length >= limit) return;
		const relEntry = path.join(rel, dirent.name);
		out.push({ name: dirent.name, path: relEntry, type: entryType(dirent) });
		if (depth > 0 && dirent.isDirectory()) {
			await collect(path.join(abs, dirent.name), relEntry, depth - 1, limit, out);
		}
	}
}

export const getWorkspacePathTool: AgentTool = {
	name: 'get_workspace_path',
	description: 'Get the absolute path of the workspace.',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, ctx) {
		return textResult(ctx.services.workspace.getRootPath());
	},
};
