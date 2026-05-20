import { act, renderHook } from '@testing-library/react';
import type { RealtimeTranscriptionEvent } from '../../../../../src/shared/realtime-transcription';
import { useRealtimeDictation } from '../../../../../src/renderer/src/pages/home/hooks';

const originalMediaDevices = navigator.mediaDevices;
const originalLanguage = navigator.language;
const originalAudioContext = globalThis.AudioContext;
const originalApp = (window as Window & { app?: Window['app'] }).app;
const originalRealtimeTranscription = (
	window as Window & { realtimeTranscription?: Window['realtimeTranscription'] }
).realtimeTranscription;

type FakeProcessor = {
	onaudioprocess: ((event: AudioProcessingEvent) => void) | null;
	connect: jest.Mock<void, [unknown]>;
	disconnect: jest.Mock<void, []>;
};

function defineNavigatorValue<TKey extends keyof Navigator>(
	key: TKey,
	value: Navigator[TKey]
): void {
	Object.defineProperty(navigator, key, {
		configurable: true,
		value,
	});
}

function defineAudioContext(value: typeof AudioContext | undefined): void {
	Object.defineProperty(globalThis, 'AudioContext', {
		configurable: true,
		value,
	});
}

function defineApp(value: Partial<Window['app']> | undefined): void {
	Object.defineProperty(window, 'app', {
		configurable: true,
		value,
	});
}

function defineRealtimeTranscription(
	value: Window['realtimeTranscription'] | undefined
): void {
	Object.defineProperty(window, 'realtimeTranscription', {
		configurable: true,
		value,
	});
}

function createMediaStream(): {
	readonly audioTrack: MediaStreamTrack;
	readonly stopTrack: jest.Mock<void, []>;
	readonly stream: MediaStream;
} {
	const stopTrack = jest.fn();
	const audioTrack = { enabled: true, stop: stopTrack } as unknown as MediaStreamTrack;
	const stream = {
		getAudioTracks: () => [audioTrack],
		getTracks: () => [audioTrack],
	} as unknown as MediaStream;

	return { audioTrack, stopTrack, stream };
}

function createAudioContextMock(): {
	readonly AudioContextMock: typeof AudioContext;
	readonly getProcessor: () => FakeProcessor | null;
} {
	let processor: FakeProcessor | null = null;
	const source = {
		connect: jest.fn(),
		disconnect: jest.fn(),
	};

	class FakeAudioContext {
		readonly destination = {};
		readonly sampleRate: number;

		constructor(options?: AudioContextOptions) {
			this.sampleRate = options?.sampleRate ?? 48_000;
		}

		createMediaStreamSource(): MediaStreamAudioSourceNode {
			return source as unknown as MediaStreamAudioSourceNode;
		}

		createScriptProcessor(): ScriptProcessorNode {
			processor = {
				onaudioprocess: null,
				connect: jest.fn(),
				disconnect: jest.fn(),
			};
			return processor as unknown as ScriptProcessorNode;
		}

		async resume(): Promise<void> {
			return undefined;
		}

		async close(): Promise<void> {
			return undefined;
		}
	}

	return {
		AudioContextMock: FakeAudioContext as unknown as typeof AudioContext,
		getProcessor: () => processor,
	};
}

function createRealtimeTranscriptionMock(): {
	readonly api: Window['realtimeTranscription'];
	readonly emit: (event: RealtimeTranscriptionEvent) => void;
} {
	let listener: ((event: RealtimeTranscriptionEvent) => void) | null = null;
	const api: Window['realtimeTranscription'] = {
		appendAudio: jest.fn(),
		cancel: jest.fn(async () => undefined),
		finish: jest.fn(async () => undefined),
		onEvent: jest.fn((callback) => {
			listener = callback;
			return jest.fn();
		}),
		start: jest.fn(async () => ({
			id: 'session-1',
			model: 'gpt-realtime-whisper',
			sampleRate: 24_000,
		})),
	};

	return {
		api,
		emit: (event) => listener?.(event),
	};
}

describe('useRealtimeDictation', () => {
	afterEach(() => {
		defineNavigatorValue('mediaDevices', originalMediaDevices);
		defineNavigatorValue('language', originalLanguage);
		defineAudioContext(originalAudioContext);
		defineApp(originalApp);
		defineRealtimeTranscription(originalRealtimeTranscription);
	});

	it('reports an unavailable realtime transcription preload API without opening the microphone', async () => {
		const getUserMedia = jest.fn();
		const { AudioContextMock } = createAudioContextMock();
		defineNavigatorValue('mediaDevices', { getUserMedia } as unknown as MediaDevices);
		defineAudioContext(AudioContextMock);
		defineRealtimeTranscription(undefined);

		const { result } = renderHook(() =>
			useRealtimeDictation({ value: '', onValueChange: jest.fn() })
		);

		await act(async () => {
			await expect(result.current.start()).resolves.toBe(false);
		});

		expect(getUserMedia).not.toHaveBeenCalled();
		expect(result.current.status).toBe('error');
		expect(result.current.errorMessage).toBe('Realtime transcription API is unavailable.');
	});

	it('streams microphone PCM to realtime transcription and applies completed transcript text', async () => {
		const onValueChange = jest.fn();
		const { stream, stopTrack } = createMediaStream();
		const getUserMedia = jest.fn(async () => stream);
		const { AudioContextMock, getProcessor } = createAudioContextMock();
		const transcription = createRealtimeTranscriptionMock();
		defineNavigatorValue('language', 'en-US');
		defineNavigatorValue('mediaDevices', { getUserMedia } as unknown as MediaDevices);
		defineAudioContext(AudioContextMock);
		defineApp({
			getMicrophonePermission: jest.fn(async () => ({
				enabled: true,
				systemStatus: 'granted',
				canRequest: false,
			})),
		});
		defineRealtimeTranscription(transcription.api);

		const { result } = renderHook(() =>
			useRealtimeDictation({ value: 'Existing prompt', onValueChange })
		);

		await act(async () => {
			await expect(result.current.start()).resolves.toBe(true);
		});

		expect(transcription.api.start).toHaveBeenCalledWith({ language: 'en' });
		expect(result.current.status).toBe('recording');

		act(() => {
			getProcessor()?.onaudioprocess?.({
				inputBuffer: {
					getChannelData: () => new Float32Array([0, 0.25, -0.25]),
				},
			} as AudioProcessingEvent);
		});

		expect(transcription.api.appendAudio).toHaveBeenCalledWith('session-1', expect.any(String));

		act(() => {
			transcription.emit({
				type: 'committed',
				sessionId: 'session-1',
				itemId: 'item-1',
			});
		});

		act(() => {
			transcription.emit({
				type: 'delta',
				sessionId: 'session-1',
				itemId: 'item-1',
				contentIndex: 0,
				delta: 'hello',
			});
		});

		expect(onValueChange).toHaveBeenLastCalledWith('Existing prompt hello');

		act(() => {
			transcription.emit({
				type: 'completed',
				sessionId: 'session-1',
				itemId: 'item-1',
				contentIndex: 0,
				transcript: 'hello world',
			});
		});

		expect(onValueChange).toHaveBeenLastCalledWith('Existing prompt hello world');

		await act(async () => {
			await result.current.finish();
		});

		expect(transcription.api.finish).toHaveBeenCalledWith('session-1');
		expect(stopTrack).toHaveBeenCalled();
		expect(result.current.status).toBe('finishing');

		act(() => {
			transcription.emit({ type: 'closed', sessionId: 'session-1' });
		});

		expect(result.current.status).toBe('idle');
	});
});
