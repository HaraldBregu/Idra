const registerCommandWithEvent = jest.fn();

jest.mock('../../../../src/main/ipc/core/gateway', () => ({ registerCommandWithEvent }));

import { BrowserWindow } from 'electron';
import { RealtimeVoiceIpc } from '../../../../src/main/ipc/realtime_voice';
import { RealtimeVoiceChannels } from '../../../../src/shared/ipc_channels_definitions';

function command(channel: string): (...args: unknown[]) => unknown {
	return registerCommandWithEvent.mock.calls.find(([registered]) => registered === channel)?.[1];
}

it('routes realtime voice lifecycle commands through the invoking window owner', async () => {
	const manager = {
		start: jest.fn(async () => ({ id: 'voice' })),
		appendAudio: jest.fn(async () => undefined),
		interrupt: jest.fn(async () => undefined),
		stop: jest.fn(async () => undefined),
	};
	const sender = {};
	jest.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 42, isDestroyed: () => false } as never);
	new RealtimeVoiceIpc().register({ realtimeVoice: manager as never }, {} as never);

	await command(RealtimeVoiceChannels.startSession)({ sender }, { chatSessionId: 'chat' });
	await command(RealtimeVoiceChannels.appendAudio)({ sender }, 'voice', 'AAAA');
	await command(RealtimeVoiceChannels.interruptSession)({ sender }, 'voice');
	await command(RealtimeVoiceChannels.stopSession)({ sender }, 'voice');

	expect(manager.start).toHaveBeenCalledWith(42, { chatSessionId: 'chat' });
	expect(manager.appendAudio).toHaveBeenCalledWith(42, 'voice', 'AAAA');
	expect(manager.interrupt).toHaveBeenCalledWith(42, 'voice');
	expect(manager.stop).toHaveBeenCalledWith(42, 'voice');
});
