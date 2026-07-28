import { camera, microphone, screen } from '../../../recorder';
import type { Tool } from '../../types';
import { recorderStatusTool } from './status';
import { recorderTool, type RecorderSurface } from './tool';

const SURFACES: RecorderSurface[] = [
	{
		name: 'recorder_microphone',
		recorder: microphone,
		source: 'audio from the user microphone',
		prefix: 'microphone',
	},
	{
		name: 'recorder_camera',
		recorder: camera,
		source: 'video (with audio) from the user camera',
		prefix: 'camera',
	},
	{
		name: 'recorder_screen',
		recorder: screen,
		source: 'video of the user screen (no audio)',
		prefix: 'screen',
	},
];

export function recorderTools(): Tool[] {
	return SURFACES.flatMap((surface) => [recorderTool(surface), recorderStatusTool(surface)]);
}
