import path from 'node:path';
import { z } from 'zod';
import { startRecording, waitForRecording } from '../../audio';
import { agentLocation } from '../../shared/agent_location';
import { resolveUserPath } from '../../shared/user_path';
import type { Tool } from '../types';
import { tool } from './tool';

export function audioRecorderTool(): Tool {
	return tool({
		name: 'audio_recorder',
		description:
			'Record audio from the user microphone for a given duration. Requires an open app window. Saves the recording as an audio file and returns its absolute path. If you reference it in markdown, use the returned path.',
		inputSchema: z.object({
			duration: z
				.number()
				.min(1)
				.max(600)
				.describe('Recording duration in seconds (max 600).'),
			directory: z
				.string()
				.optional()
				.describe(
					'Optional directory to save the recording in, relative to the agent workspace. ~ expands to the user home. Defaults to the agent workspace directory; only set it when the user asks for a specific location.'
				),
		}),
		execute: async ({ duration, directory }) => {
			const targetDir = resolveUserPath(directory ?? '.', agentLocation());
			const url = path.join(targetDir, `audio-${Date.now()}.webm`);
			const recording = startRecording({ url, duration: duration * 1000 });
			const finished = await waitForRecording(recording.id);
			if (finished.status !== 'completed') {
				throw new Error(finished.error ?? `Recording ${finished.status}.`);
			}
			return {
				path: finished.url,
				mimeType: finished.mimeType,
				durationMs: finished.duration,
				size: finished.size,
			};
		},
	});
}
