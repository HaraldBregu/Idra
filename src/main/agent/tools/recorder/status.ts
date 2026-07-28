import { z } from 'zod';
import type { Tool } from '../../types';
import { tool } from '../tool';
import type { RecorderSurface } from './tool';

export function recorderStatusTool({ name, recorder }: RecorderSurface): Tool {
	return tool({
		name: `${name}_status`,
		description: `Check the status of a background recording started with ${name}. With wait=true it blocks until the recording finishes and returns the final result. The recorded file exists only once status is "completed".`,
		inputSchema: z.object({
			id: z.string().min(1).describe(`Recording id returned by ${name}.`),
			wait: z
				.boolean()
				.optional()
				.describe('Wait for the recording to finish before returning. Defaults to false.'),
		}),
		execute: async ({ id, wait }) => {
			const recording = wait ? await recorder.waitFor(id) : recorder.get(id);
			if (!recording) throw new Error(`Unknown recording: ${id}`);
			return {
				id: recording.id,
				path: recording.url,
				status: recording.status,
				durationMs: recording.duration,
				mimeType: recording.mimeType,
				size: recording.size,
				error: recording.error,
			};
		},
	});
}
