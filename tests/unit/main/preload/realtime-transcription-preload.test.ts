import { ipcRenderer } from 'electron';
import { realtimeTranscription } from '../../../../src/preload';
import { RealtimeTranscriptionChannels } from '../../../../src/shared/ipc-channels';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

describe('realtime transcription preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
		mockedIpcRenderer.send.mockReset();
		mockedIpcRenderer.on.mockReset();
		mockedIpcRenderer.removeListener.mockReset();
	});

	it('invokes the start, finish, and cancel realtime transcription IPC channels', async () => {
		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({
				success: true,
				data: { id: 'session-1', model: 'gpt-realtime-whisper', sampleRate: 24_000 },
			})
			.mockResolvedValueOnce({ success: true, data: undefined })
			.mockResolvedValueOnce({ success: true, data: undefined });

		await expect(realtimeTranscription.start({ language: 'en' })).resolves.toEqual({
			id: 'session-1',
			model: 'gpt-realtime-whisper',
			sampleRate: 24_000,
		});
		await expect(realtimeTranscription.finish('session-1')).resolves.toBeUndefined();
		await expect(realtimeTranscription.cancel('session-1')).resolves.toBeUndefined();

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			1,
			RealtimeTranscriptionChannels.start,
			{ language: 'en' }
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			2,
			RealtimeTranscriptionChannels.finish,
			'session-1'
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			3,
			RealtimeTranscriptionChannels.cancel,
			'session-1'
		);
	});

	it('sends audio chunks and unsubscribes event listeners through the preload boundary', () => {
		let ipcListener: Parameters<typeof mockedIpcRenderer.on>[1] | null = null;
		mockedIpcRenderer.on.mockImplementation((_channel, listener) => {
			ipcListener = listener;
			return mockedIpcRenderer;
		});
		mockedIpcRenderer.removeListener.mockReturnValue(mockedIpcRenderer);
		const callback = jest.fn();

		const unsubscribe = realtimeTranscription.onEvent(callback);
		realtimeTranscription.appendAudio('session-1', 'AAAA');
		ipcListener?.({} as Electron.IpcRendererEvent, {
			type: 'closed',
			sessionId: 'session-1',
		});
		unsubscribe();

		expect(mockedIpcRenderer.on).toHaveBeenCalledWith(
			RealtimeTranscriptionChannels.event,
			expect.any(Function)
		);
		expect(mockedIpcRenderer.send).toHaveBeenCalledWith(
			RealtimeTranscriptionChannels.appendAudio,
			'session-1',
			'AAAA'
		);
		expect(callback).toHaveBeenCalledWith({ type: 'closed', sessionId: 'session-1' });
		expect(mockedIpcRenderer.removeListener).toHaveBeenCalledWith(
			RealtimeTranscriptionChannels.event,
			ipcListener
		);
	});

	it('rejects invalid realtime transcription preload payloads', () => {
		expect(() => realtimeTranscription.start({ language: 123 } as never)).toThrow(
			'Invalid realtime transcription language.'
		);
		expect(() => realtimeTranscription.appendAudio('', 'AAAA')).toThrow(
			'Invalid realtime transcription session id.'
		);
		expect(() => realtimeTranscription.appendAudio('session-1', 'not base64?')).toThrow(
			'Invalid realtime transcription audio chunk.'
		);
		expect(() => realtimeTranscription.finish('')).toThrow(
			'Invalid realtime transcription session id.'
		);
		expect(() => realtimeTranscription.cancel('')).toThrow(
			'Invalid realtime transcription session id.'
		);
	});
});
