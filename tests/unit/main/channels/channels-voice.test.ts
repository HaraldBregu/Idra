import { loadChannelVoice } from '../../../../src/main/channels/channels_voice';

describe('loadChannelVoice', () => {
	it('checks the downloaded size when metadata omitted it', async () => {
		await expect(
			loadChannelVoice({
				mimeType: 'audio/ogg',
				load: async () => ({
					data: Buffer.alloc(20 * 1024 * 1024 + 1).toString('base64'),
					encoding: 'base64',
					mimeType: 'audio/ogg',
				}),
			})
		).rejects.toThrow('too large');
	});

	it('returns validated audio with its actual byte length', async () => {
		await expect(
			loadChannelVoice({
				mimeType: 'audio/ogg',
				load: async () => ({
					data: 'YWJj',
					encoding: 'base64',
					mimeType: 'audio/ogg',
				}),
			})
		).resolves.toMatchObject({ byteLength: 3 });
	});
});
