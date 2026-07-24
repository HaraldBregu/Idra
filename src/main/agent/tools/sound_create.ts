import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { createSound } from '../../sound';
import { libraryLocation } from '../../shared/library_location';
import type { Tool } from '../types';
import { tool } from './tool';

export function createSoundTool(): Tool {
	return tool({
		name: 'create_sound',
		description:
			'Generate music or a sound effect from a text prompt using the configured text-to-audio provider. Saves the audio under the library directory and returns its absolute path. If you reference it in markdown, use the returned path.',
		inputSchema: z.object({
			prompt: z.string().min(1).describe('Text prompt describing the music or sound to generate.'),
		}),
		execute: async ({ prompt }) => {
			const { base64, mimeType } = await createSound({ prompt });
			const ext = mimeType.includes('mpeg') ? 'mp3' : mimeType.split('/')[1]?.split('+')[0] || 'mp3';
			const fileName = `sound-${Date.now()}.${ext}`;
			const libraryDir = libraryLocation();
			await fs.mkdir(libraryDir, { recursive: true });
			const filePath = path.join(libraryDir, fileName);
			await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
			return { path: filePath, mimeType };
		},
	});
}
