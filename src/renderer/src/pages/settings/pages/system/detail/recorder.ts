import { useCallback, useEffect, useRef, useState } from 'react';
import type { SystemMedia } from './media';

export type RecorderState = 'idle' | 'recording' | 'recorded';

export interface MediaRecorderTest {
	readonly state: RecorderState;
	readonly error: string;
	readonly recordedUrl: string | null;
	readonly elapsedSeconds: number;
	readonly videoRef: React.RefObject<HTMLVideoElement | null>;
	readonly start: () => Promise<void>;
	readonly stop: () => void;
	readonly reset: () => void;
}

export function useMediaRecorderTest(media: SystemMedia): MediaRecorderTest {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const urlRef = useRef<string | null>(null);
	const timerRef = useRef<number | null>(null);

	const [state, setState] = useState<RecorderState>('idle');
	const [error, setError] = useState('');
	const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	const stopStream = useCallback(() => {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
	}, []);

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			window.clearInterval(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const stop = useCallback(() => {
		clearTimer();
		if (recorderRef.current && recorderRef.current.state !== 'inactive') {
			recorderRef.current.stop();
		}
		stopStream();
	}, [clearTimer, stopStream]);

	const start = useCallback(async () => {
		setError('');
		if (urlRef.current) {
			URL.revokeObjectURL(urlRef.current);
			urlRef.current = null;
		}
		setRecordedUrl(null);
		setElapsedSeconds(0);

		try {
			const stream =
				media.source === 'display'
					? await navigator.mediaDevices.getDisplayMedia(media.constraints)
					: await navigator.mediaDevices.getUserMedia(media.constraints);
			streamRef.current = stream;

			if (media.video && videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play().catch(() => undefined);
			}
			// Stopping the share from the OS overlay ends the test too.
			stream.getVideoTracks()[0]?.addEventListener('ended', () => stop());

			chunksRef.current = [];
			const recorder = new MediaRecorder(stream);
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: recorder.mimeType || undefined });
				const url = URL.createObjectURL(blob);
				urlRef.current = url;
				setRecordedUrl(url);
				setState('recorded');
			};
			recorderRef.current = recorder;
			recorder.start();
			setState('recording');
			timerRef.current = window.setInterval(() => {
				setElapsedSeconds((seconds) => seconds + 1);
			}, 1000);
		} catch (err) {
			stopStream();
			setState('idle');
			setError(err instanceof Error ? err.message : String(err));
		}
	}, [media, stop, stopStream]);

	const reset = useCallback(() => {
		if (urlRef.current) {
			URL.revokeObjectURL(urlRef.current);
			urlRef.current = null;
		}
		setRecordedUrl(null);
		setElapsedSeconds(0);
		setError('');
		setState('idle');
	}, []);

	// Tear down any active capture when the media changes or the page unmounts.
	useEffect(() => {
		return () => {
			if (timerRef.current !== null) window.clearInterval(timerRef.current);
			if (recorderRef.current && recorderRef.current.state !== 'inactive') {
				recorderRef.current.stop();
			}
			streamRef.current?.getTracks().forEach((track) => track.stop());
			if (urlRef.current) URL.revokeObjectURL(urlRef.current);
		};
	}, [media.id]);

	return { state, error, recordedUrl, elapsedSeconds, videoRef, start, stop, reset };
}
