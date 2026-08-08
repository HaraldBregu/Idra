import { loadChannels } from '../../../../src/main/channels/catalog';

describe('channel manifests', () => {
	it('loads channel services and icons from resources/channels', () => {
		const channels = loadChannels();

		expect(channels.map((channel) => channel.provider.id)).toEqual(['discord', 'telegram']);
		expect(channels[0]).toEqual(
			expect.objectContaining({
				id: 'discord-bot',
				name: 'Discord Bot API',
				provider: expect.objectContaining({
					id: 'discord',
					name: 'Discord',
					iconDarkUrl: expect.stringContaining(
						'/resources/channels/discord/images/svg/discord-color.svg'
					),
					iconLightUrl: expect.stringContaining(
						'/resources/channels/discord/images/svg/discord-color.svg'
					),
				}),
			})
		);
	});
});
