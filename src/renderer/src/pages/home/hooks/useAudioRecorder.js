import { useCallback, useEffect, useRef, useState } from 'react';
const AUDIO_MIME_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
];
const RECORDING_TIMESLICE_MS = 1000;
const CLOCK_INTERVAL_MS = 250;
function canRecordAudio() {
    const mediaDevices = navigator.mediaDevices;
    return Boolean(mediaDevices &&
        typeof mediaDevices.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined');
}
function supportedMimeType() {
    if (typeof MediaRecorder === 'undefined')
        return undefined;
    return AUDIO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}
function extensionForMimeType(mimeType) {
    if (mimeType.startsWith('audio/mp4'))
        return 'm4a';
    if (mimeType.startsWith('audio/ogg'))
        return 'ogg';
    return 'webm';
}
function createRecordingId() {
    if (typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
    return `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function createRecordingFileName(mimeType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `friday-audio-${timestamp}.${extensionForMimeType(mimeType)}`;
}
function normalizePermissionState(state) {
    if (state === 'granted' || state === 'denied' || state === 'prompt')
        return state;
    return 'unknown';
}
async function queryMicrophonePermission() {
    if (!navigator.permissions?.query)
        return 'unknown';
    try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        return normalizePermissionState(status.state);
    }
    catch {
        return 'unknown';
    }
}
async function getAppMicrophonePermission() {
    const appApi = window.app;
    if (!appApi?.getMicrophonePermission)
        return null;
    try {
        return await appApi.getMicrophonePermission();
    }
    catch {
        return null;
    }
}
function recorderErrorMessage(error) {
    if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
            return 'Microphone access is blocked. Allow microphone access and try again.';
        }
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            return 'No microphone was found.';
        }
    }
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return 'Audio recording failed.';
}
function stopStream(stream) {
    stream?.getTracks().forEach((track) => track.stop());
}
function objectUrlForBlob(blob) {
    if (typeof URL.createObjectURL !== 'function')
        return undefined;
    return URL.createObjectURL(blob);
}
export function useAudioRecorder() {
    const [status, setStatus] = useState('idle');
    const [permissionState, setPermissionState] = useState('unknown');
    const [errorMessage, setErrorMessage] = useState(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [stream, setStream] = useState(null);
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const startedAtMsRef = useRef(0);
    const clockRef = useRef(null);
    const discardOnStopRef = useRef(false);
    const stopResolverRef = useRef(null);
    const stopClock = useCallback(() => {
        if (clockRef.current === null)
            return;
        window.clearInterval(clockRef.current);
        clockRef.current = null;
    }, []);
    const startClock = useCallback(() => {
        stopClock();
        clockRef.current = window.setInterval(() => {
            setElapsedMs(Date.now() - startedAtMsRef.current);
        }, CLOCK_INTERVAL_MS);
    }, [stopClock]);
    const resetRecorder = useCallback(() => {
        stopClock();
        stopStream(streamRef.current);
        recorderRef.current = null;
        streamRef.current = null;
        setStream(null);
        chunksRef.current = [];
        startedAtMsRef.current = 0;
        discardOnStopRef.current = false;
        stopResolverRef.current = null;
        setIsMuted(false);
        setElapsedMs(0);
    }, [stopClock]);
    const setMuted = useCallback((nextMuted) => {
        setIsMuted(nextMuted);
        streamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = !nextMuted;
        });
    }, []);
    const start = useCallback(async () => {
        if (recorderRef.current?.state === 'recording')
            return true;
        if (!canRecordAudio()) {
            setPermissionState('unsupported');
            setStatus('error');
            setErrorMessage('Audio recording is not supported in this environment.');
            return false;
        }
        setStatus('checking-permission');
        setErrorMessage(null);
        setElapsedMs(0);
        try {
            const nextPermissionState = await queryMicrophonePermission();
            setPermissionState(nextPermissionState);
            if (nextPermissionState === 'denied') {
                throw new Error('Microphone access is blocked. Allow microphone access and try again.');
            }
            const appPermission = await getAppMicrophonePermission();
            if (appPermission && !appPermission.enabled) {
                setPermissionState('disabled');
                throw new Error('Microphone recording is disabled in Settings.');
            }
            if (appPermission?.systemStatus === 'denied' ||
                appPermission?.systemStatus === 'restricted') {
                setPermissionState('denied');
                throw new Error('Microphone access is blocked. Allow microphone access and try again.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            const mimeType = supportedMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;
            streamRef.current = stream;
            setStream(stream);
            chunksRef.current = [];
            startedAtMsRef.current = Date.now();
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0)
                    chunksRef.current.push(event.data);
            };
            recorder.onerror = () => {
                setStatus('error');
                setErrorMessage('Audio recording failed.');
            };
            recorder.onstop = () => {
                const chunks = chunksRef.current;
                const shouldDiscard = discardOnStopRef.current;
                const resolveStop = stopResolverRef.current;
                const durationMs = Math.max(0, Date.now() - startedAtMsRef.current);
                const recorderMimeType = recorder.mimeType || mimeType || 'audio/webm';
                resetRecorder();
                setStatus('idle');
                if (shouldDiscard || chunks.length === 0) {
                    resolveStop?.(null);
                    return;
                }
                const blob = new Blob(chunks, { type: recorderMimeType });
                if (blob.size === 0) {
                    resolveStop?.(null);
                    return;
                }
                const file = new File([blob], createRecordingFileName(blob.type), {
                    type: blob.type,
                    lastModified: Date.now(),
                });
                resolveStop?.({
                    id: createRecordingId(),
                    file,
                    url: objectUrlForBlob(blob),
                    durationMs,
                    mimeType: blob.type,
                    size: blob.size,
                });
            };
            recorder.start(RECORDING_TIMESLICE_MS);
            setPermissionState('granted');
            setStatus('recording');
            startClock();
            return true;
        }
        catch (error) {
            resetRecorder();
            setStatus('error');
            setErrorMessage(recorderErrorMessage(error));
            return false;
        }
    }, [resetRecorder, startClock]);
    const stop = useCallback(async () => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive')
            return null;
        setStatus('stopping');
        stopClock();
        discardOnStopRef.current = false;
        return new Promise((resolve) => {
            stopResolverRef.current = resolve;
            try {
                recorder.stop();
            }
            catch (error) {
                resetRecorder();
                setStatus('error');
                setErrorMessage(recorderErrorMessage(error));
                resolve(null);
            }
        });
    }, [resetRecorder, stopClock]);
    const cancel = useCallback(async () => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
            resetRecorder();
            setStatus('idle');
            return;
        }
        setStatus('stopping');
        stopClock();
        discardOnStopRef.current = true;
        await new Promise((resolve) => {
            stopResolverRef.current = () => resolve();
            try {
                recorder.stop();
            }
            catch {
                resetRecorder();
                setStatus('idle');
                resolve();
            }
        });
    }, [resetRecorder, stopClock]);
    useEffect(() => {
        return () => {
            const recorder = recorderRef.current;
            stopClock();
            if (recorder && recorder.state !== 'inactive') {
                recorder.onstop = null;
                try {
                    recorder.stop();
                }
                catch {
                    // ignore teardown errors
                }
            }
            stopStream(streamRef.current);
        };
    }, [stopClock]);
    return {
        cancel,
        elapsedMs,
        errorMessage,
        isMuted,
        isSupported: canRecordAudio(),
        permissionState,
        setMuted,
        start,
        status,
        stream,
        stop,
    };
}
