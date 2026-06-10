import type { Workspace } from '../core/workspace';
import type { RuntimeTool } from '../types';

export function writeTool(workspace: Workspace): RuntimeTool {
	return {
		name: 'write_file',
		description: 'Write UTF-8 text content to a workspace file by relative path.',
		schema: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					description: 'Relative path inside the workspace.',
				},
				content: {
					type: 'string',
					description: 'UTF-8 text content to write.',
				},
			},
			required: ['path', 'content'],
			additionalProperties: false,
		},
		run: async (input) => {
			const filePath = input.path;
			const content = input.content;
			if (typeof filePath !== 'string' || !filePath.trim()) {
				throw new Error('write_file requires a non-empty path.');
			}
			if (typeof content !== 'string') {
				throw new Error('write_file requires string content.');
			}
			await workspace.writeFile(filePath, content);
			return { path: filePath };
		},
	};
}
