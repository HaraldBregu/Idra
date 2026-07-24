import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { createVideo } from '../../video';
import { libraryLocation } from '../../shared/library_location';
import type { Tool } from '../types';
import { tool } from './tool';

export function createVideoTool(): Tool {
	return tool({
		name: 'create_video',
		description:
			'Generate a video from a text prompt using the configured text-to-video provider. Saves the video under the library directory and returns its absolute path. Video generation can take several minutes; if you reference it in markdown, use the returned path.',
		inputSchema: z.object({
			prompt: z.string().min(1).describe('Text prompt describing the video to generate.'),
		}),
		execute: async ({ prompt }) => {
			const { base64, mimeType } = await createVideo({ prompt });
			const ext = mimeType.split('/')[1]?.split('+')[0] || 'mp4';
			const fileName = `video-${Date.now()}.${ext}`;
			const libraryDir = libraryLocation();
			await fs.mkdir(libraryDir, { recursive: true });
			const filePath = path.join(libraryDir, fileName);
			await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
			return { path: filePath, mimeType };
		},
	});
}
