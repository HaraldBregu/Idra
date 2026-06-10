import type { Workspace } from '../core/workspace';
import type { RuntimeTool } from '../types';

export function readTool(workspace: Workspace): RuntimeTool {
	return {
		name: 'read_file',
		description: 'Read a UTF-8 text file from the workspace by relative path.',
		schema: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					description: 'Relative path inside the workspace.',
				},
			},
			required: ['path'],
			additionalProperties: false,
		},
		run: async (input) => {
			const filePath = input.path;
			if (typeof filePath !== 'string' || !filePath.trim()) {
				throw new Error('read_file requires a non-empty path.');
			}
			return workspace.readFile(filePath);
		},
	};
}
