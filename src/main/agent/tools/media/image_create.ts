import { z } from 'zod';
import { createImage } from '../../../models/image';
import type { Tool } from '../../types';
import { saveMedia } from './save';
import { tool } from '../tool';

export function createImageTool(): Tool {
	return tool({
		name: 'create_image',
		description:
			'Generate an image from a text prompt using the configured text-to-image provider. Saves the image in your agent workspace directory and returns its absolute path. The image is shown to the user automatically; if you reference it in markdown, use the returned path.',
		inputSchema: z.object({
			prompt: z.string().min(1).describe('Text prompt describing the image to generate.'),
			directory: z
				.string()
				.optional()
				.describe(
					'Optional directory to save the image in, relative to the agent workspace. ~ expands to the user home. Defaults to the agent workspace directory; only set it when the user asks for a specific location.'
				),
		}),
		execute: async ({ prompt, directory }, signal) => {
			const { base64, mimeType } = await createImage({ prompt }, signal);
			const ext = mimeType.split('/')[1]?.split('+')[0] || 'png';
			const filePath = await saveMedia('image', ext, base64, directory, signal);
			return { path: filePath, mimeType };
		},
	});
}
