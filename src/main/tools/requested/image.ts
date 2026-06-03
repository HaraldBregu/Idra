import { objectSchema, type RequestedTool } from './shared';

export const imageGenerateTool = {
	name: 'image_gen.imagegen',
	description: 'Generates images from text prompts and edits uploaded images based on requested visual changes.',
	schema: objectSchema({ prompt: { type: 'string' } }),
} as const satisfies RequestedTool;
