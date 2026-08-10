const createImage = jest.fn();
const createVideo = jest.fn();
const createSound = jest.fn();
const saveMedia = jest.fn();

jest.mock('../../../../../src/main/models/image', () => ({ createImage }));
jest.mock('../../../../../src/main/models/video', () => ({ createVideo }));
jest.mock('../../../../../src/main/models/sound', () => ({ createSound }));
jest.mock('../../../../../src/main/agent/tools/media/save', () => ({ saveMedia }));

import { createImageTool } from '../../../../../src/main/agent/tools/media/create_image';
import { createSoundTool } from '../../../../../src/main/agent/tools/media/create_sound';
import { createVideoTool } from '../../../../../src/main/agent/tools/media/create_video';

beforeEach(() => {
	jest.clearAllMocks();
	createImage.mockResolvedValue({ base64: 'aW1hZ2U=', mimeType: 'image/png' });
	createVideo.mockResolvedValue({ base64: 'dmlkZW8=', mimeType: 'video/mp4' });
	createSound.mockResolvedValue({ base64: 'c291bmQ=', mimeType: 'audio/mpeg' });
	saveMedia.mockResolvedValue('/tmp/generated');
});

it.each([
	['image', createImageTool, createImage, 'png'],
	['video', createVideoTool, createVideo, 'mp4'],
	['sound', createSoundTool, createSound, 'mp3'],
] as const)('propagates the run signal through %s generation and saving', async (kind, factory, create, extension) => {
	const controller = new AbortController();
	await factory().run({ prompt: 'generate this' }, controller.signal);

	expect(create).toHaveBeenCalledWith({ prompt: 'generate this' }, controller.signal);
	expect(saveMedia).toHaveBeenCalledWith(
		kind,
		extension,
		expect.any(String),
		undefined,
		controller.signal
	);
});
