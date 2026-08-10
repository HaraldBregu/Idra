import { z } from 'zod';
import { microphone } from '../../../recorder';
import type { Tool } from '../../types';
import { tool } from '../tool';

export const microphoneRecorderStopTool: Tool = tool({
	name: 'microphone_recorder_stop',
	description: 'Stop an active microphone recording and begin saving its captured data.',
	inputSchema: z.object({ id: z.string().uuid() }),
	execute: ({ id }) => {
		const recording = microphone.get(id);
		if (!recording) throw new Error(`Unknown microphone recording: ${id}`);
		microphone.stop(id);
		return { id, path: recording.url, status: microphone.get(id)?.status };
	},
});
