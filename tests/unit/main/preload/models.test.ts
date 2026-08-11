const invoke = jest.fn();
const on = jest.fn();
const removeListener = jest.fn();

jest.mock('electron', () => ({
	ipcRenderer: { invoke, on, removeListener },
}));

import { models } from '../../../../src/preload/models';
import { RealtimeVoiceChannels } from '../../../../src/shared/ipc_channels_definitions';

beforeEach(() => {
	jest.clearAllMocks();
	invoke.mockResolvedValue({ success: true, data: undefined });
});

it('normalizes realtime voice session requests before invoking main', async () => {
	await models.realtimeVoice.startSession({ chatSessionId: ' session-1 ' });

	expect(invoke).toHaveBeenCalledWith(RealtimeVoiceChannels.startSession, {
		chatSessionId: 'session-1',
	});
	expect(() => models.realtimeVoice.startSession({ chatSessionId: ' ' })).toThrow(
		'Invalid realtime voice chat session id.'
	);
});

it('rejects invalid realtime voice audio and selection values', () => {
	expect(() => models.realtimeVoice.appendAudio('', 'YWJj')).toThrow(
		'Invalid realtime voice session id.'
	);
	expect(() => models.realtimeVoice.appendAudio('session-1', 'not base64')).toThrow(
		'Invalid realtime voice audio chunk.'
	);
	expect(() => models.realtimeVoice.setProviderId(' ')).toThrow(
		'Invalid realtime voice provider id.'
	);
	expect(() => models.realtimeVoice.setModelId(' ')).toThrow('Invalid realtime voice model id.');
});

it('subscribes and unsubscribes realtime voice session events', () => {
	const callback = jest.fn();
	const unsubscribe = models.realtimeVoice.onSessionEvent(callback);

	expect(on).toHaveBeenCalledWith(RealtimeVoiceChannels.sessionEvent, expect.any(Function));
	unsubscribe();
	expect(removeListener).toHaveBeenCalledWith(
		RealtimeVoiceChannels.sessionEvent,
		expect.any(Function)
	);
});
