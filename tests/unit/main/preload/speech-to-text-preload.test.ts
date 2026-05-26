import { ipcRenderer } from 'electron';
import { speechToText } from '../../../../src/preload';
import { SpeechToTextChannels } from '../../../../src/shared/ipc-channels';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

describe('speech-to-text preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
		mockedIpcRenderer.send.mockReset();
		mockedIpcRenderer.on.mockReset();
		mockedIpcRenderer.removeListener.mockReset();
	});

	it('invokes batch transcription through the speech-to-text IPC channel', async () => {
		mockedIpcRenderer.invoke.mockResolvedValueOnce({
			success: true,
			data: { transcript: 'hello world', model: 'gpt-4o-mini-transcribe' },
		});

		await expect(
			speechToText.transcribe({ audio: ' AAAA ', language: ' en-US ' })
		).resolves.toEqual({
			transcript: 'hello world',
			model: 'gpt-4o-mini-transcribe',
		});

		expect(mockedIpcRenderer.invoke).toHaveBeenCalledWith(
			SpeechToTextChannels.transcribe,
			{ audio: 'AAAA', language: 'en-US' }
		);
	});

	it('starts, finishes, and cancels dictation sessions through typed IPC channels', async () => {
		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({
				success: true,
				data: { id: 'session-1', model: 'gpt-realtime-whisper', sampleRate: 24_000 },
			})
			.mockResolvedValueOnce({ success: true, data: undefined })
			.mockResolvedValueOnce({ success: true, data: undefined });

		await expect(speechToText.startDictation({ language: 'it' })).resolves.toEqual({
			id: 'session-1',
			model: 'gpt-realtime-whisper',
			sampleRate: 24_000,
		});
		await expect(speechToText.finishDictation('session-1')).resolves.toBeUndefined();
		await expect(speechToText.cancelDictation('session-1')).resolves.toBeUndefined();

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			1,
			SpeechToTextChannels.startDictation,
			{ language: 'it' }
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			2,
			SpeechToTextChannels.finishDictation,
			'session-1'
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			3,
			SpeechToTextChannels.cancelDictation,
			'session-1'
		);
	});

	it('sends dictation audio chunks and unsubscribes event listeners', () => {
		let ipcListener: Parameters<typeof mockedIpcRenderer.on>[1] | null = null;
		mockedIpcRenderer.on.mockImplementation((_channel, listener) => {
			ipcListener = listener;
			return mockedIpcRenderer;
		});
		mockedIpcRenderer.removeListener.mockReturnValue(mockedIpcRenderer);
		const callback = jest.fn();

		const unsubscribe = speechToText.onEvent(callback);
		speechToText.appendAudio('session-1', 'AAAA');
		ipcListener?.({} as Electron.IpcRendererEvent, {
			type: 'completed',
			sessionId: 'session-1',
			itemId: 'item-1',
			contentIndex: 0,
			transcript: 'hello',
		});
		unsubscribe();

		expect(mockedIpcRenderer.on).toHaveBeenCalledWith(
			SpeechToTextChannels.event,
			expect.any(Function)
		);
		expect(mockedIpcRenderer.send).toHaveBeenCalledWith(
			SpeechToTextChannels.appendAudio,
			'session-1',
			'AAAA'
		);
		expect(callback).toHaveBeenCalledWith({
			type: 'completed',
			sessionId: 'session-1',
			itemId: 'item-1',
			contentIndex: 0,
			transcript: 'hello',
		});
		expect(mockedIpcRenderer.removeListener).toHaveBeenCalledWith(
			SpeechToTextChannels.event,
			ipcListener
		);
	});

	it('rejects invalid speech-to-text preload payloads', () => {
		expect(() => speechToText.transcribe({ audio: '' })).toThrow(
			'Invalid speech-to-text audio.'
		);
		expect(() => speechToText.transcribe({ audio: 'not base64?' })).toThrow(
			'Invalid speech-to-text audio.'
		);
		expect(() =>
			speechToText.transcribe({ audio: 'AAAA', language: 123 } as never)
		).toThrow('Invalid realtime transcription language.');
		expect(() => speechToText.startDictation({ language: 123 } as never)).toThrow(
			'Invalid realtime transcription language.'
		);
		expect(() => speechToText.appendAudio('', 'AAAA')).toThrow(
			'Invalid speech-to-text session id.'
		);
		expect(() => speechToText.appendAudio('session-1', 'not base64?')).toThrow(
			'Invalid speech-to-text audio chunk.'
		);
		expect(() => speechToText.finishDictation('')).toThrow(
			'Invalid speech-to-text session id.'
		);
		expect(() => speechToText.cancelDictation('')).toThrow(
			'Invalid speech-to-text session id.'
		);
	});
});
