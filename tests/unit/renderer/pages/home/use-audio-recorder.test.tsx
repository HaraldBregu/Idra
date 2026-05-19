import { act, renderHook } from '@testing-library/react';
import { useAudioRecorder } from '../../../../../src/renderer/src/pages/home/hooks';

const originalMediaDevices = navigator.mediaDevices;
const originalPermissions = navigator.permissions;
const originalMediaRecorder = globalThis.MediaRecorder;
const originalCreateObjectUrl = URL.createObjectURL;
const originalApp = window.app;

function defineNavigatorValue<TKey extends keyof Navigator>(key: TKey, value: Navigator[TKey]): void {
	Object.defineProperty(navigator, key, {
		configurable: true,
		value,
	});
}

function defineGlobalMediaRecorder(value: typeof MediaRecorder | undefined): void {
	Object.defineProperty(globalThis, 'MediaRecorder', {
		configurable: true,
		value,
	});
}

function defineCreateObjectUrl(value: typeof URL.createObjectURL | undefined): void {
	Object.defineProperty(URL, 'createObjectURL', {
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

describe('useAudioRecorder', () => {
	afterEach(() => {
		defineNavigatorValue('mediaDevices', originalMediaDevices);
		defineNavigatorValue('permissions', originalPermissions);
		defineGlobalMediaRecorder(originalMediaRecorder);
		defineCreateObjectUrl(originalCreateObjectUrl);
		defineApp(originalApp);
	});

	it('reports unsupported recording when media APIs are unavailable', async () => {
		defineNavigatorValue('mediaDevices', undefined as Navigator['mediaDevices']);
		defineGlobalMediaRecorder(undefined);

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await expect(result.current.start()).resolves.toBe(false);
		});

		expect(result.current.permissionState).toBe('unsupported');
		expect(result.current.errorMessage).toBe('Audio recording is not supported in this environment.');
	});

	it('does not request a stream when microphone permission is denied', async () => {
		const getUserMedia = jest.fn();
		defineNavigatorValue('mediaDevices', { getUserMedia } as unknown as MediaDevices);
		defineNavigatorValue('permissions', {
			query: jest.fn(async () => ({ state: 'denied' })),
		} as unknown as Permissions);
		defineGlobalMediaRecorder(class FakeMediaRecorder {} as typeof MediaRecorder);

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await expect(result.current.start()).resolves.toBe(false);
		});

		expect(getUserMedia).not.toHaveBeenCalled();
		expect(result.current.permissionState).toBe('denied');
		expect(result.current.errorMessage).toBe('Microphone access is blocked. Allow microphone access and try again.');
	});

	it('does not request a stream when microphone recording is disabled in settings', async () => {
		const getUserMedia = jest.fn();
		defineNavigatorValue('mediaDevices', { getUserMedia } as unknown as MediaDevices);
		defineNavigatorValue('permissions', {
			query: jest.fn(async () => ({ state: 'granted' })),
		} as unknown as Permissions);
		defineGlobalMediaRecorder(class FakeMediaRecorder {} as typeof MediaRecorder);
		defineApp({
			getMicrophonePermission: jest.fn(async () => ({
				enabled: false,
				systemStatus: 'granted',
				canRequest: false,
			})),
		});

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await expect(result.current.start()).resolves.toBe(false);
		});

		expect(getUserMedia).not.toHaveBeenCalled();
		expect(result.current.permissionState).toBe('disabled');
		expect(result.current.errorMessage).toBe('Microphone recording is disabled in Settings.');
	});

	it('records audio and returns a file when stopped', async () => {
		const stopTrack = jest.fn();
		const audioTrack = { enabled: true, stop: stopTrack } as unknown as MediaStreamTrack;
		const stream = {
			getAudioTracks: () => [audioTrack],
			getTracks: () => [audioTrack],
		} as unknown as MediaStream;
		const getUserMedia = jest.fn(async () => stream);

		class FakeMediaRecorder {
			static isTypeSupported = jest.fn(() => true);

			mimeType: string;
			ondataavailable: ((event: BlobEvent) => void) | null = null;
			onerror: (() => void) | null = null;
			onstop: (() => void) | null = null;
			state: RecordingState = 'inactive';

			constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
				this.mimeType = options?.mimeType ?? 'audio/webm';
			}

			start(): void {
				this.state = 'recording';
			}

			stop(): void {
				this.state = 'inactive';
				this.ondataavailable?.({
					data: new Blob(['audio'], { type: this.mimeType }),
				} as BlobEvent);
				this.onstop?.();
			}
		}

		defineNavigatorValue('mediaDevices', { getUserMedia } as unknown as MediaDevices);
		defineNavigatorValue('permissions', {
			query: jest.fn(async () => ({ state: 'granted' })),
		} as unknown as Permissions);
		defineGlobalMediaRecorder(FakeMediaRecorder as unknown as typeof MediaRecorder);
		defineCreateObjectUrl(jest.fn(() => 'blob:friday-audio') as typeof URL.createObjectURL);

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await expect(result.current.start()).resolves.toBe(true);
		});

		expect(result.current.status).toBe('recording');

		let recording: Awaited<ReturnType<typeof result.current.stop>> | null = null;
		await act(async () => {
			recording = await result.current.stop();
		});

		expect(recording?.file.name).toMatch(/^friday-audio-.*\.webm$/);
		expect(recording?.mimeType).toBe('audio/webm;codecs=opus');
		expect(recording?.url).toBe('blob:friday-audio');
		expect(stopTrack).toHaveBeenCalled();
		expect(result.current.status).toBe('idle');
	});
});
