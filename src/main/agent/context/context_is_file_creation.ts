import fs from 'node:fs';
import type { ToolContextState } from './context_types';

export function isFileCreation(state: ToolContextState): boolean {
	if (state.toolName !== 'write_file') return false;
	try {
		fs.lstatSync(state.path);
		return false;
	} catch (error) {
		return (
			typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
		);
	}
}
