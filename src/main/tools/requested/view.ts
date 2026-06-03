import { objectSchema, type RequestedTool } from './shared';

export const viewImageTool = {
	name: 'functions.view_image',
	description: 'Opens a local image file for visual inspection.',
	schema: objectSchema({
		path: { type: 'string' },
		detail: { type: 'string', enum: ['high', 'original'] },
	}, ['path']),
} as const satisfies RequestedTool;
