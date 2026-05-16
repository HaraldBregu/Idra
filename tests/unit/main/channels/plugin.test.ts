import { defineChannelPluginEntry } from '../../../../src/main/channels/plugin';
import { telegramChannelPlugin } from '../../../../src/main/channels/telegram/plugin';

describe('channel plugin entry helpers', () => {
	it('registers external plugin entries through the channel api', () => {
		const entry = defineChannelPluginEntry({ plugin: telegramChannelPlugin });
		const registerChannel = jest.fn();

		entry.register({ registerChannel });

		expect(registerChannel).toHaveBeenCalledWith({ plugin: telegramChannelPlugin });
	});

	it('keeps direct plugin exports narrow for bundled channel-plugin-api files', () => {
		expect(defineChannelPluginEntry(telegramChannelPlugin)).toBe(telegramChannelPlugin);
	});
});
