const microphone = { start: jest.fn(), stop: jest.fn(), cancel: jest.fn(), get: jest.fn() };
const camera = { start: jest.fn(), stop: jest.fn(), cancel: jest.fn(), get: jest.fn() };
const screen = { start: jest.fn(), stop: jest.fn(), cancel: jest.fn(), get: jest.fn() };

jest.mock('../../../../../src/main/recorder', () => ({ microphone, camera, screen }));
jest.mock('../../../../../src/main/shared/agent_location', () => ({
	agentLocation: () => '/workspace',
}));
jest.mock('../../../../../src/main/shared/user_path', () => ({
	resolveUserPath: () => '/workspace',
}));

import { cameraRecorderTool } from '../../../../../src/main/agent/tools/system/camera_recorder';
import { cameraRecorderStopTool } from '../../../../../src/main/agent/tools/system/camera_recorder_stop';
import { microphoneRecorderTool } from '../../../../../src/main/agent/tools/system/microphone_recorder';
import { microphoneRecorderStopTool } from '../../../../../src/main/agent/tools/system/microphone_recorder_stop';
import { screenRecorderTool } from '../../../../../src/main/agent/tools/system/screen_recorder';
import { screenRecorderStopTool } from '../../../../../src/main/agent/tools/system/screen_recorder_stop';

const id = '123e4567-e89b-12d3-a456-426614174000';

beforeEach(() => {
	jest.clearAllMocks();
	for (const recorder of [microphone, camera, screen]) {
		recorder.start.mockReturnValue({ id, url: '/workspace/capture.webm', status: 'recording', duration: 1_000 });
		recorder.get.mockReturnValue({ id, url: '/workspace/capture.webm', status: 'recording', duration: 1_000 });
	}
});

it.each([
	['microphone', microphoneRecorderTool, microphone],
	['camera', cameraRecorderTool, camera],
	['screen', screenRecorderTool, screen],
] as const)('allows and cancels an owned %s recording with the run', async (_name, createTool, recorder) => {
	const controller = new AbortController();
	const captureTool = createTool();

	await captureTool.run({ duration: 1, filename: 'capture.webm' }, controller.signal);
	controller.abort();

	expect(captureTool).toMatchObject({
		defaultPermission: 'allow',
		risk: 'critical',
		effect: 'sensor',
	});
	expect(captureTool.hardApproval).toBeUndefined();
	expect(recorder.cancel).toHaveBeenCalledWith(id);
});

it.each([
	['microphone_recorder_stop', microphoneRecorderStopTool, microphone],
	['camera_recorder_stop', cameraRecorderStopTool, camera],
	['screen_recorder_stop', screenRecorderStopTool, screen],
] as const)('provides the explicit %s tool', async (name, stopTool, recorder) => {
	await expect(stopTool.run({ id })).resolves.toMatchObject({ id, status: 'recording' });
	expect(stopTool.name).toBe(name);
	expect(recorder.stop).toHaveBeenCalledWith(id);
});
