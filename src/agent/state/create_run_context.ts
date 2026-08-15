import type { RunContext } from './types';

export function createRunContext(): RunContext {
	return {
		fileAccess: {
			readDirectories: new Set(),
			createdFiles: new Set(),
		},
	};
}
