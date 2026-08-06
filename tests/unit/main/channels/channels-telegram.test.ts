import type { Bot } from 'grammy';
import { registerVoiceHandler } from '../../../../src/main/channels/adapters/voice';

describe('Telegram voice messages', () => {
	it('logs received voice messages', () => {
		const on = jest.fn();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		registerVoiceHandler({ on } as unknown as Bot);

		expect(on).toHaveBeenCalledWith('message:voice', expect.any(Function));
		const handler = on.mock.calls[0][1] as () => void;
		handler();

		expect(log).toHaveBeenCalledWith('[telegram] voice message received');
	});
});
