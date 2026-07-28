import path from 'node:path';
import { z } from 'zod';
import { startRecording } from '../../audio';
import { agentLocation } from '../../shared/agent_location';
import { resolveUserPath } from '../../shared/user_path';
import type { Tool } from '../types';
import { tool } from './tool';

export function audioRecorderTool(): Tool {
	return tool({
		name: 'audio_recorder',
		description:
			'Start recording audio from the user microphone for a given duration. Requires an open app window. The recording runs in the background: this returns immediately with a recording id and the destination path, and the file is written when the recording finishes. Use audio_recorder_status to check progress or wait for completion before using the file.',
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
			return {
				id: recording.id,
				path: recording.url,
				status: recording.status,
				durationMs: recording.duration,
			};
		},
	});
}
