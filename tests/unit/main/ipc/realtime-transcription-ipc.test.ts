import { useRealtimeTranscriptionEndpoint } from '../../../../src/main/ipc/realtime-transcription-ipc';

describe('realtime transcription IPC', () => {
	it('connects realtime transcription sockets to the transcription session endpoint', () => {
		const url = new URL('wss://api.openai.com/v1/realtime?model=gpt-realtime-whisper');

		useRealtimeTranscriptionEndpoint(url);

		expect(url.toString()).toBe(
			'wss://api.openai.com/v1/realtime/transcription_sessions?model=gpt-realtime-whisper'
		);
	});

	it('preserves custom base URL prefixes when selecting the transcription endpoint', () => {
		const url = new URL('wss://example.test/openai/v1/realtime?model=gpt-realtime-whisper');

		useRealtimeTranscriptionEndpoint(url);

		expect(url.pathname).toBe('/openai/v1/realtime/transcription_sessions');
	});
});
