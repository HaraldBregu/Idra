import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from '../../../src/renderer/src/pages/home/context';
import { useRealtimeVoice } from '../../../src/renderer/src/pages/home/hooks/useRealtimeVoice';
import type { RealtimeVoiceEvent, RealtimeVoiceSession } from '../../../src/shared/realtime_voice';

jest.mock('@/lib/providers', () => ({
	providerModels: (_providerId: string, capability: string) =>
		capability === 'realtime-voice' ? [{ id: 'gpt-realtime-2.1', name: 'GPT Realtime' }] : [],
}));

const track = { enabled: true, stop: jest.fn() };
const mediaStream = {
	getTracks: () => [track],
	getAudioTracks: () => [track],
} as unknown as MediaStream;

let processor: {
	onaudioprocess: ((event: { inputBuffer: { getChannelData: () => Float32Array } }) => void) | null;
	connect: jest.Mock;
	disconnect: jest.Mock;
};
let playedSource: { stop: jest.Mock; onended: (() => void) | null };

class FakeAudioContext {
	readonly sampleRate = 48_000;
	readonly currentTime = 0;
	readonly destination = {} as AudioDestinationNode;
	createMediaStreamSource = jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn() }));
	createScriptProcessor = jest.fn(() => {
		processor = { onaudioprocess: null, connect: jest.fn(), disconnect: jest.fn() };
		return processor;
	});
	createAnalyser = jest.fn(() => ({
		fftSize: 512,
		smoothingTimeConstant: 0,
		connect: jest.fn(),
		disconnect: jest.fn(),
		getByteTimeDomainData: jest.fn(),
	}));
	createBuffer = jest.fn((_channels: number, length: number, sampleRate: number) => ({
		duration: length / sampleRate,
		getChannelData: () => new Float32Array(length),
	}));
	createBufferSource = jest.fn(() => {
		playedSource = { stop: jest.fn(), onended: null };
		return {
			...playedSource,
			buffer: null,
			connect: jest.fn(),
			start: jest.fn(),
		};
	});
	resume = jest.fn().mockResolvedValue(undefined);
	close = jest.fn().mockResolvedValue(undefined);
}

const session: RealtimeVoiceSession = {
	id: 'voice-session',
	providerId: 'openai',
	modelId: 'gpt-realtime-2.1',
	input: { format: 'pcm16', sampleRate: 24_000, channels: 1 },
	output: { format: 'pcm16', sampleRate: 24_000, channels: 1 },
};

const api = {
	startSession: jest.fn(),
	appendAudio: jest.fn(),
	interruptSession: jest.fn(),
	stopSession: jest.fn(),
	onSessionEvent: jest.fn(),
	getOptions: jest.fn(),
	setOptions: jest.fn(),
	getProviderId: jest.fn(),
	setProviderId: jest.fn(),
	getModelId: jest.fn(),
	setModelId: jest.fn(),
};

function wrapper({ children }: { readonly children: ReactNode }): React.JSX.Element {
	return <Provider>{children}</Provider>;
}

describe('useRealtimeVoice', () => {
	let emit: (event: RealtimeVoiceEvent) => void;

	beforeEach(() => {
		jest.clearAllMocks();
		track.enabled = true;
		Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
		Object.defineProperty(navigator, 'mediaDevices', {
			configurable: true,
			value: { getUserMedia: jest.fn().mockResolvedValue(mediaStream) },
		});
		api.appendAudio.mockResolvedValue(undefined);
		api.interruptSession.mockResolvedValue(undefined);
		api.stopSession.mockResolvedValue(undefined);
		api.onSessionEvent.mockImplementation((listener: (event: RealtimeVoiceEvent) => void) => {
			emit = listener;
			return jest.fn();
		});
		window.models = { realtimeVoice: api } as unknown as Window['models'];
		window.app = {
			getMicrophonePermission: jest.fn().mockResolvedValue({
				enabled: true,
				systemStatus: 'granted',
				canRequest: false,
			}),
		} as unknown as Window['app'];
	});

	it('survives early start events, mutes capture, interrupts playback, and tears down', async () => {
		let resolveStart!: (value: RealtimeVoiceSession) => void;
		api.startSession.mockReturnValue(
			new Promise<RealtimeVoiceSession>((resolve) => {
				resolveStart = resolve;
			})
		);
		const onClosed = jest.fn();
		const { result, unmount } = renderHook(
			() => useRealtimeVoice({ chatSessionId: 'chat-1', onClosed }),
			{ wrapper }
		);

		let startPromise!: Promise<boolean>;
		act(() => {
			startPromise = result.current.start();
		});
		await waitFor(() => expect(api.startSession).toHaveBeenCalledWith({ chatSessionId: 'chat-1' }));
		expect(result.current.status).toBe('connecting');

		act(() => emit({ type: 'state', sessionId: session.id, status: 'listening' }));
		await act(async () => {
			resolveStart(session);
			await startPromise;
		});
		expect(result.current.status).toBe('listening');

		act(() => {
			processor.onaudioprocess?.({
				inputBuffer: { getChannelData: () => new Float32Array([0.25, -0.25]) },
			});
		});
		await waitFor(() => expect(api.appendAudio).toHaveBeenCalledTimes(1));
		act(() => result.current.setMuted(true));
		expect(track.enabled).toBe(false);
		act(() => {
			processor.onaudioprocess?.({
				inputBuffer: { getChannelData: () => new Float32Array([0.5]) },
			});
		});
		expect(api.appendAudio).toHaveBeenCalledTimes(1);

		act(() => emit({ type: 'assistant_audio_delta', sessionId: session.id, audio: 'AAA=' }));
		act(() => emit({ type: 'input_speech_started', sessionId: session.id }));
		expect(playedSource.stop).toHaveBeenCalled();
		expect(api.interruptSession).toHaveBeenCalledWith(session.id);

		await act(async () => result.current.end());
		expect(api.stopSession).toHaveBeenCalledWith(session.id);
		expect(track.stop).toHaveBeenCalled();
		expect(onClosed).toHaveBeenCalled();
		unmount();
	});

	it('turns append failures into a terminal visible error', async () => {
		api.startSession.mockResolvedValue(session);
		api.appendAudio.mockRejectedValue(new Error('Audio transport failed.'));
		const onClosed = jest.fn();
		const { result } = renderHook(
			() => useRealtimeVoice({ chatSessionId: 'chat-1', onClosed }),
			{ wrapper }
		);
		await act(async () => result.current.start());
		act(() => {
			processor.onaudioprocess?.({
				inputBuffer: { getChannelData: () => new Float32Array([0.25]) },
			});
		});
		await waitFor(() => expect(result.current.errorMessage).toBe('Audio transport failed.'));
		expect(result.current.status).toBe('error');
		expect(api.stopSession).toHaveBeenCalledWith(session.id);
		expect(onClosed).toHaveBeenCalled();
	});
});
