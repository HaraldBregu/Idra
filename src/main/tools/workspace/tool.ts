import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { applyPatchTool } from '../filesystem/apply-patch';
import { copyTool } from '../filesystem/copy';
import { fileDeleteTool } from '../filesystem/delete';
import { fileEditTool } from '../filesystem/edit';
import { directoryListTool } from '../filesystem/list';
import { moveTool } from '../filesystem/move';
import { fileReadTool } from '../filesystem/read';
import { searchFilesTool } from '../filesystem/search';
import { fileWriteTool } from '../filesystem/write';

type WorkspaceAction =
	| 'read'
	| 'list'
	| 'search'
	| 'write'
	| 'edit'
	| 'delete'
	| 'apply_patch'
	| 'copy'
	| 'move';

interface WorkspaceArgs {
	action: WorkspaceAction;
	path?: string;
	offset?: number;
	limit?: number;
	pattern?: string;
	content?: string;
	old?: string;
	new?: string;
	replaceAll?: boolean;
	recursive?: boolean;
	source?: string;
	destination?: string;
	overwrite?: boolean;
	diff?: string;
}

export const workspaceTool: AgentTool<WorkspaceArgs> = {
	name: 'workspace',
	description:
		'Run a structured workspace filesystem action. Supports read, list, search, write, edit, delete, apply_patch, copy, and move while preserving file safety checks.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: [
					'read',
					'list',
					'search',
					'write',
					'edit',
					'delete',
					'apply_patch',
					'copy',
					'move',
				],
				description: 'Workspace filesystem action to perform.',
			},
			path: {
				type: 'string',
				description: 'File or directory path for read, list, write, edit, or delete.',
			},
			offset: { type: 'number', description: '1-indexed line offset for read.' },
			limit: { type: 'number', description: 'Maximum rows for read, list, or search.' },
			pattern: { type: 'string', description: 'Glob pattern for search.' },
			content: { type: 'string', description: 'UTF-8 content for write.' },
			old: { type: 'string', description: 'Existing exact text for edit.' },
			new: { type: 'string', description: 'Replacement exact text for edit.' },
			replaceAll: { type: 'boolean', description: 'Replace every old-text match for edit.' },
			recursive: { type: 'boolean', description: 'Required to delete a directory tree.' },
			source: { type: 'string', description: 'Source path for copy or move.' },
			destination: { type: 'string', description: 'Destination path for copy or move.' },
			overwrite: { type: 'boolean', description: 'Overwrite destination for copy or move.' },
			diff: { type: 'string', description: 'Unified diff text for apply_patch.' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		switch (args.action) {
			case 'read':
				if (typeof args.path !== 'string' || args.path.trim() === '')
					return textResult('workspace: path is required for read.', true);
				return fileReadTool.execute(
					{ path: args.path, offset: args.offset, limit: args.limit },
					ctx
				);
			case 'list':
				return directoryListTool.execute({ path: args.path, limit: args.limit }, ctx);
			case 'search':
				if (typeof args.pattern !== 'string' || args.pattern.trim() === '')
					return textResult('workspace: pattern is required for search.', true);
				return searchFilesTool.execute(
					{ pattern: args.pattern, path: args.path, limit: args.limit },
					ctx
				);
			case 'write':
				if (typeof args.path !== 'string' || args.path.trim() === '')
					return textResult('workspace: path is required for write.', true);
				if (typeof args.content !== 'string')
					return textResult('workspace: content is required for write.', true);
				return fileWriteTool.execute({ path: args.path, content: args.content }, ctx);
			case 'edit':
				if (typeof args.path !== 'string' || args.path.trim() === '')
					return textResult('workspace: path is required for edit.', true);
				if (typeof args.old !== 'string' || args.old.length === 0)
					return textResult('workspace: old text is required for edit.', true);
				if (typeof args.new !== 'string')
					return textResult('workspace: new text is required for edit.', true);
				return fileEditTool.execute(
					{ path: args.path, old: args.old, new: args.new, replaceAll: args.replaceAll },
					ctx
				);
			case 'delete':
				if (typeof args.path !== 'string' || args.path.trim() === '')
					return textResult('workspace: path is required for delete.', true);
				return fileDeleteTool.execute({ path: args.path, recursive: args.recursive }, ctx);
			case 'apply_patch':
				if (typeof args.diff !== 'string' || args.diff.trim() === '')
					return textResult('workspace: diff is required for apply_patch.', true);
				return applyPatchTool.execute({ diff: args.diff }, ctx);
			case 'copy':
				if (typeof args.source !== 'string' || args.source.trim() === '')
					return textResult('workspace: source is required for copy.', true);
				if (typeof args.destination !== 'string' || args.destination.trim() === '')
					return textResult('workspace: destination is required for copy.', true);
				return copyTool.execute(
					{ source: args.source, destination: args.destination, overwrite: args.overwrite },
					ctx
				);
			case 'move':
				if (typeof args.source !== 'string' || args.source.trim() === '')
					return textResult('workspace: source is required for move.', true);
				if (typeof args.destination !== 'string' || args.destination.trim() === '')
					return textResult('workspace: destination is required for move.', true);
				return moveTool.execute(
					{ source: args.source, destination: args.destination, overwrite: args.overwrite },
					ctx
				);
			default:
				return textResult(`workspace: unsupported action ${String(args.action)}`, true);
		}
	},
};
