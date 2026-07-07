import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { createImage } from '../../image';
import type { Tool } from '../types';
import { tool } from './tool';

export function createImageTool(agentDir: string): Tool {
	return tool({
		name: 'create_image',
		description:
			'Generate an image from a text prompt using the configured text-to-image provider. Saves the image under the agent library directory and returns its path relative to the agent directory. The image is shown to the user automatically; if you reference it in markdown, use the returned path.',
		inputSchema: z.object({
			prompt: z.string().min(1).describe('Text prompt describing the image to generate.'),
		}),
		execute: async ({ prompt }) => {
			const { base64, mimeType } = await createImage({ prompt });
			const ext = mimeType.split('/')[1]?.split('+')[0] || 'png';
			const fileName = `image-${Date.now()}.${ext}`;
			const libraryDir = path.join(agentDir, 'library');
			await fs.mkdir(libraryDir, { recursive: true });
			await fs.writeFile(path.join(libraryDir, fileName), Buffer.from(base64, 'base64'));
			return { path: path.posix.join('library', fileName), mimeType };
		},
	});
}
