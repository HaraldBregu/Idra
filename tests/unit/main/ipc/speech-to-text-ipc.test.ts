import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { RealtimeTranscriptionIpc } from '../../../../src/main/ipc/realtime-transcription-ipc';
import { SpeechToTextIpc } from '../../../../src/main/ipc/speech-to-text-ipc';
import type { MainServiceContainer } from '../../../../src/main/app/service-registry';
import {
	RealtimeTranscriptionChannels,
	SpeechToTextChannels,
} from '../../../../src/shared/ipc-channels';

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

function registeredListener(channel: string) {
	const call = (ipcMain.on as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Listener not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => void;
}

function createContainer(speechToText: Record<string, unknown>): MainServiceContainer {
	const logger = { info: jest.fn() };
	return {
		get: jest.fn((key: string) => {
			if (key === 'logger') return logger;
			if (key === 'speechToText') return speechToText;
			throw new Error(`Unexpected service: ${key}`);
		}),
	} as unknown as MainServiceContainer;
}

describe('SpeechToTextIpc', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('routes speech-to-text IPC through the registered speech-to-text service', async () => {
		const speechToText = {
			transcribe: jest.fn(async () => ({ transcript: 'hello', model: 'stt-model' })),
			start: jest.fn(async () => ({ id: 'session-1', model: 'stt-model', sampleRate: 24_000 })),
			appendAudio: jest.fn(),
			finish: jest.fn(),
			cancel: jest.fn(),
		};
		const container = createContainer(speechToText);
		const sender = { id: 1, send: jest.fn() };

		new SpeechToTextIpc().register(container, new EventBus());

		await expect(
			registeredHandler(SpeechToTextChannels.transcribe)({}, { audio: ' AAAA ' })
		).resolves.toEqual({
			success: true,
			data: { transcript: 'hello', model: 'stt-model' },
		});
		await expect(
			registeredHandler(SpeechToTextChannels.startDictation)({ sender }, { language: 'en' })
		).resolves.toEqual({
			success: true,
			data: { id: 'session-1', model: 'stt-model', sampleRate: 24_000 },
		});
		registeredListener(SpeechToTextChannels.appendAudio)({ sender }, 'session-1', 'AAAA');
		await expect(
			registeredHandler(SpeechToTextChannels.finishDictation)({ sender }, 'session-1')
		).resolves.toEqual({ success: true, data: undefined });
		await expect(
			registeredHandler(SpeechToTextChannels.cancelDictation)({ sender }, 'session-1')
		).resolves.toEqual({ success: true, data: undefined });

		expect(speechToText.transcribe).toHaveBeenCalledWith({ audio: 'AAAA' });
		expect(speechToText.start).toHaveBeenCalledWith(sender, { language: 'en' }, {
			eventChannel: SpeechToTextChannels.event,
		});
		expect(speechToText.appendAudio).toHaveBeenCalledWith(sender, 'session-1', 'AAAA');
		expect(speechToText.finish).toHaveBeenCalledWith(sender, 'session-1');
		expect(speechToText.cancel).toHaveBeenCalledWith(sender, 'session-1');
		expect(container.get).toHaveBeenCalledWith('speechToText');
		expect(container.get).not.toHaveBeenCalledWith('store');
	});

	it('routes realtime transcription IPC through the registered speech-to-text service', async () => {
		const speechToText = {
			start: jest.fn(async () => ({ id: 'session-1', model: 'stt-model', sampleRate: 24_000 })),
			appendAudio: jest.fn(),
			finish: jest.fn(),
			cancel: jest.fn(),
		};
		const container = createContainer(speechToText);
		const sender = { id: 1, send: jest.fn() };

		new RealtimeTranscriptionIpc().register(container, new EventBus());

		await expect(
			registeredHandler(RealtimeTranscriptionChannels.start)({ sender }, { language: 'en' })
		).resolves.toEqual({
			success: true,
			data: { id: 'session-1', model: 'stt-model', sampleRate: 24_000 },
		});
		registeredListener(RealtimeTranscriptionChannels.appendAudio)({ sender }, 'session-1', 'AAAA');
		await expect(
			registeredHandler(RealtimeTranscriptionChannels.finish)({ sender }, 'session-1')
		).resolves.toEqual({ success: true, data: undefined });
		await expect(
			registeredHandler(RealtimeTranscriptionChannels.cancel)({ sender }, 'session-1')
		).resolves.toEqual({ success: true, data: undefined });

		expect(speechToText.start).toHaveBeenCalledWith(sender, { language: 'en' });
		expect(speechToText.appendAudio).toHaveBeenCalledWith(sender, 'session-1', 'AAAA');
		expect(speechToText.finish).toHaveBeenCalledWith(sender, 'session-1');
		expect(speechToText.cancel).toHaveBeenCalledWith(sender, 'session-1');
		expect(container.get).toHaveBeenCalledWith('speechToText');
		expect(container.get).not.toHaveBeenCalledWith('store');
	});
});
