import { objectSchema, type RequestedTool } from './shared';

export const applyPatchTool = {
	name: 'functions.apply_patch',
	description: 'Applies a structured patch that adds, updates, moves, or deletes files.',
	schema: objectSchema({
		patch: { type: 'string', description: 'Freeform patch text starting with *** Begin Patch.' },
	}, ['patch']),
} as const satisfies RequestedTool;
