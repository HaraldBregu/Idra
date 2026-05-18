import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from '../common';
import { markCoreTool, ToolInputError } from '../common';
import { asParamsRecord, readNumberParam, readStringParam } from '../params';
import { TOOL_LIMITS } from '../limits';

export type FileReadToolOptions = {
	workspaceDir: string;
	maxLines?: number;
	allowAbsolutePaths?: boolean;
};

export type FileReadDetails = {
	path: string;
	absolutePath: string;
	offset: number;
	lineCount: number;
	truncated: boolean;
	size: number;
};

const DEFAULT_MAX_LINES = TOOL_LIMITS.read.defaultLines;

function resolveWorkspacePath(workspaceDir: string, target: string, allowAbsolutePaths = false): string {
	const resolved = path.isAbsolute(target) ? path.resolve(target) : path.resolve(workspaceDir, target);
	const root = path.resolve(workspaceDir);
	const insideRoot = resolved === root || resolved.startsWith(`${root}${path.sep}`);
	if (!insideRoot && !allowAbsolutePaths) {
		throw new ToolInputError('Path is outside the workspace.', { path: target });
	}
	return resolved;
}

function throwIfAborted(signal?: AbortSignal): void {
	if (!signal?.aborted) return;
	const error = new Error('Tool execution aborted.');
	error.name = 'AbortError';
	throw error;
}

export function createReadTool(options: FileReadToolOptions): AgentTool<Record<string, unknown>, FileReadDetails> {
	return markCoreTool({
		name: 'read',
		label: 'Read File',
		description:
			'Read a UTF-8 file from the workspace and return line-numbered text. Use offset and limit for large files.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Workspace-relative file path.' },
				offset: { type: 'number', description: '1-indexed starting line.' },
				limit: { type: 'number', description: 'Maximum number of lines to return.' },
			},
			required: ['path'],
			additionalProperties: false,
		},
		async execute(_toolCallId, params, signal) {
			throwIfAborted(signal);
			const record = asParamsRecord(params);
			const requestedPath = readStringParam(record, 'path', { required: true, minLength: 1 })!;
			const offset = readNumberParam(record, 'offset', { defaultValue: 1, min: 1, integer: true })!;
			const limit = readNumberParam(record, 'limit', {
				defaultValue: options.maxLines ?? DEFAULT_MAX_LINES,
				min: 1,
					max: TOOL_LIMITS.read.maxLines,
				integer: true,
			})!;
			const absolutePath = resolveWorkspacePath(
				options.workspaceDir,
				requestedPath,
				options.allowAbsolutePaths
			);
			const stat = await fs.stat(absolutePath);
			if (!stat.isFile()) throw new ToolInputError('Path is not a file.', { path: requestedPath });
			const raw = await fs.readFile(absolutePath, 'utf8');
			throwIfAborted(signal);
			const lines = raw.split('\n');
			const startIndex = offset - 1;
			const slice = lines.slice(startIndex, startIndex + limit);
			const text = slice.map((line, index) => `${String(offset + index).padStart(6, ' ')}\t${line}`).join('\n');
			const truncated = startIndex + limit < lines.length;
			return {
				content: [
					{
						type: 'text',
						text: `# ${absolutePath}\n${text}${truncated ? `\n... (${lines.length - startIndex - limit} more lines)` : ''}`,
					},
				],
				details: {
					path: requestedPath,
					absolutePath,
					offset,
					lineCount: slice.length,
					truncated,
					size: stat.size,
				},
			};
		},
	});
}
