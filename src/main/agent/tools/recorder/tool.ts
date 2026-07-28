import path from 'node:path';
import { z } from 'zod';
import type { Recorder } from '../../../recorder';
import { agentLocation } from '../../../shared/agent_location';
import { resolveUserPath } from '../../../shared/user_path';
import type { Tool } from '../../types';
import { tool } from '../tool';

export interface RecorderSurface {
	name: string;
	recorder: Recorder;
	source: string;
	prefix: string;
}

export function recorderTool({ name, recorder, source, prefix }: RecorderSurface): Tool {
	return tool({
		name,
		description: `Start recording ${source} for a given duration. Requires an open app window. The recording runs in the background: this returns immediately with a recording id and the destination path, and the file is written when the recording finishes. Use ${name}_status to check progress or wait for completion before using the file.`,
		inputSchema: z.object({
			duration: z.number().min(1).max(600).describe('Recording duration in seconds (max 600).'),
			directory: z
				.string()
				.optional()
				.describe(
					'Optional directory to save the recording in, relative to the agent workspace. ~ expands to the user home. Defaults to the agent workspace directory; only set it when the user asks for a specific location.'
				),
			filename: z
				.string()
				.optional()
				.describe(
					`Optional file name for the recording, including the .webm extension (recordings are always WebM). Any directory part is ignored; use directory instead. Defaults to ${prefix}-<timestamp>.webm.`
				),
		}),
		execute: async ({ duration, directory, filename }) => {
			const targetDir = resolveUserPath(directory ?? '.', agentLocation());
			const url = path.join(targetDir, path.basename(filename ?? `${prefix}-${Date.now()}.webm`));
			const recording = recorder.start({ url, duration: duration * 1000 });
			return {
				id: recording.id,
				path: recording.url,
				status: recording.status,
				durationMs: recording.duration,
			};
		},
	});
}
