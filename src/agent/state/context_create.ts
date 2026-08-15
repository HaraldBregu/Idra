import type { RunContext } from './context_types';

export function createRunContext(): RunContext {
	return {
		fileAccess: {
			readDirectories: new Set(),
			createdFiles: new Set(),
		},
	};
}
