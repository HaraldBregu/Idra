const registerCommandWithEvent = jest.fn();

jest.mock('../../../../src/main/ipc/core/gateway', () => ({ registerCommandWithEvent }));

import { BrowserWindow } from 'electron';
import { RealtimeVoiceIpc } from '../../../../src/main/ipc/realtime_voice';
import { RealtimeVoiceChannels } from '../../../../src/shared/ipc_channels_definitions';

function command(channel: string): (...args: unknown[]) => unknown {
	return registerCommandWithEvent.mock.calls.find(([registered]) => registered === channel)?.[1];
}

it('routes realtime voice lifecycle commands through the invoking window owner', async () => {
	const execute = jest.fn(async () => undefined);
	const sender = {};
	jest.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 42, isDestroyed: () => false } as never);
	new RealtimeVoiceIpc().register({ conversation: { execute } as never }, {} as never);

	await command(RealtimeVoiceChannels.startSession)({ sender }, { chatSessionId: 'chat' });
	await command(RealtimeVoiceChannels.appendAudio)({ sender }, 'voice', 'AAAA');
	await command(RealtimeVoiceChannels.interruptSession)({ sender }, 'voice');
	await command(RealtimeVoiceChannels.stopSession)({ sender }, 'voice');

	expect(execute).toHaveBeenNthCalledWith(1, {
		type: 'voice',
		action: 'start',
		windowId: 42,
		request: { chatSessionId: 'chat' },
	});
	expect(execute).toHaveBeenNthCalledWith(2, {
		type: 'voice',
		action: 'append-audio',
		windowId: 42,
		sessionId: 'voice',
		audio: 'AAAA',
	});
	expect(execute).toHaveBeenNthCalledWith(3, {
		type: 'voice',
		action: 'interrupt',
		windowId: 42,
		sessionId: 'voice',
	});
	expect(execute).toHaveBeenNthCalledWith(4, {
		type: 'voice',
		action: 'stop',
		windowId: 42,
		sessionId: 'voice',
	});
});
