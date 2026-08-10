import { z } from 'zod';
import { camera } from '../../../recorder';
import type { Tool } from '../../types';
import { tool } from '../tool';

export const cameraRecorderStopTool: Tool = tool({
	name: 'camera_recorder_stop',
	description: 'Stop an active camera recording and begin saving its captured data.',
	inputSchema: z.object({ id: z.string().uuid() }),
	execute: ({ id }) => {
		const recording = camera.get(id);
		if (!recording) throw new Error(`Unknown camera recording: ${id}`);
		camera.stop(id);
		return { id, path: recording.url, status: camera.get(id)?.status };
	},
});
