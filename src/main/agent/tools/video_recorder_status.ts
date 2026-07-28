import { z } from 'zod';
import { videoRecorder } from '../../recorder';
import type { Tool } from '../types';
import { tool } from './tool';

export const videoRecorderStatusTool: Tool = tool({
	name: 'video_recorder_status',
	description:
		'Check the status of a background video recording started with video_recorder. With wait=true it blocks until the recording finishes and returns the final result. The recorded file exists only once status is "completed".',
	inputSchema: z.object({
		id: z.string().min(1).describe('Recording id returned by video_recorder.'),
		wait: z
			.boolean()
			.optional()
			.describe('Wait for the recording to finish before returning. Defaults to false.'),
	}),
	execute: async ({ id, wait }) => {
		const recording = wait ? await videoRecorder.waitFor(id) : videoRecorder.get(id);
		if (!recording) throw new Error(`Unknown video recording: ${id}`);
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
