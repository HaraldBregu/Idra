import { useCallback, useEffect, useRef, useState } from 'react';
const AUDIO_BUFFER_SIZE = 4096;
const CLOCK_INTERVAL_MS = 250;
function canCaptureAudio() {
    return Boolean(navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof AudioContext !== 'undefined');
}
async function getAppMicrophoneEnabled() {
    try {
        const settings = await window.app.getMicrophonePermission();
        return settings.enabled && settings.systemStatus !== 'denied' && settings.systemStatus !== 'restricted';
    }
    catch {
        return true;
    }
}
function dictationErrorMessage(error) {
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
    return 'Live dictation failed.';
}
function mergeDictationText(baseText, transcript) {
    if (!baseText)
        return transcript;
    if (!transcript)
        return baseText;
    const separator = /\s$/.test(baseText) || /^\s/.test(transcript) ? '' : ' ';
    return `${baseText}${separator}${transcript}`;
}
function stopStream(stream) {
    stream?.getTracks().forEach((track) => track.stop());
}
function resampleToPcm16(input, inputRate, outputRate) {
    if (input.length === 0)
        return new Int16Array();
    const ratio = inputRate / outputRate;
    const outputLength = Math.max(1, Math.floor(input.length / ratio));
    const output = new Int16Array(outputLength);
    let inputOffset = 0;
    for (let outputOffset = 0; outputOffset < outputLength; outputOffset += 1) {
        const nextInputOffset = Math.min(input.length, Math.round((outputOffset + 1) * ratio));
        let sum = 0;
        let count = 0;
        for (; inputOffset < nextInputOffset; inputOffset += 1) {
            sum += input[inputOffset] ?? 0;
            count += 1;
        }
        const sample = Math.max(-1, Math.min(1, count > 0 ? sum / count : 0));
        output[outputOffset] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output;
}
function pcm16ToBase64(pcm) {
    const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.subarray(offset, offset + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}
function preferredLanguage() {
    const language = navigator.language?.trim();
    if (!language)
        return undefined;
    return language.slice(0, 2).toLowerCase();
}
export function useRealtimeDictation({ value, onValueChange, }) {
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [stream, setStream] = useState(null);
    const valueRef = useRef(value);
    const onValueChangeRef = useRef(onValueChange);
    const sessionIdRef = useRef(null);
    const baseTextRef = useRef('');
    const itemOrderRef = useRef([]);
    const itemTextRef = useRef(new Map());
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const sourceRef = useRef(null);
    const processorRef = useRef(null);
    const clockRef = useRef(null);
    const startedAtMsRef = useRef(0);
    const mutedRef = useRef(false);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);
    useEffect(() => {
        onValueChangeRef.current = onValueChange;
    }, [onValueChange]);
    const stopClock = useCallback(() => {
        if (clockRef.current === null)
            return;
        window.clearInterval(clockRef.current);
        clockRef.current = null;
    }, []);
    const startClock = useCallback(() => {
        stopClock();
        startedAtMsRef.current = Date.now();
        clockRef.current = window.setInterval(() => {
            setElapsedMs(Date.now() - startedAtMsRef.current);
        }, CLOCK_INTERVAL_MS);
    }, [stopClock]);
    const stopAudio = useCallback(() => {
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        void audioContextRef.current?.close().catch(() => undefined);
        stopStream(streamRef.current);
        processorRef.current = null;
        sourceRef.current = null;
        audioContextRef.current = null;
        streamRef.current = null;
        setStream(null);
    }, []);
    const resetTranscript = useCallback(() => {
        itemOrderRef.current = [];
        itemTextRef.current = new Map();
    }, []);
    const applyTranscript = useCallback(() => {
        const transcript = itemOrderRef.current
            .map((itemId) => itemTextRef.current.get(itemId)?.trim() ?? '')
            .filter(Boolean)
            .join(' ');
        onValueChangeRef.current(mergeDictationText(baseTextRef.current, transcript));
    }, []);
    const ensureItem = useCallback((itemId) => {
        if (itemTextRef.current.has(itemId))
            return;
        itemTextRef.current.set(itemId, '');
        itemOrderRef.current.push(itemId);
    }, []);
    useEffect(() => {
        const api = window.stt;
        if (!api)
            return;
        return api.onRealtimeEvent((event) => {
            if (event.sessionId && event.sessionId !== sessionIdRef.current)
                return;
            if (event.type === 'committed') {
                ensureItem(event.itemId);
                return;
            }
            if (event.type === 'delta') {
                ensureItem(event.itemId);
                itemTextRef.current.set(event.itemId, `${itemTextRef.current.get(event.itemId) ?? ''}${event.delta}`);
                applyTranscript();
                return;
            }
            if (event.type === 'completed') {
                ensureItem(event.itemId);
                itemTextRef.current.set(event.itemId, event.transcript);
                applyTranscript();
                return;
            }
            if (event.type === 'error') {
                setErrorMessage(event.message);
                setStatus('error');
                return;
            }
            if (event.type === 'closed') {
                sessionIdRef.current = null;
                stopClock();
                stopAudio();
                setIsMuted(false);
                mutedRef.current = false;
                setElapsedMs(0);
                setStatus((current) => (current === 'error' ? current : 'idle'));
            }
        });
    }, [applyTranscript, ensureItem, stopAudio, stopClock]);
    const setMuted = useCallback((nextMuted) => {
        mutedRef.current = nextMuted;
        setIsMuted(nextMuted);
        streamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = !nextMuted;
        });
    }, []);
    const start = useCallback(async () => {
        if (status === 'recording' || status === 'connecting')
            return true;
        if (!canCaptureAudio()) {
            setStatus('error');
            setErrorMessage('Live dictation is not supported in this environment.');
            return false;
        }
        setStatus('checking-permission');
        setErrorMessage(null);
        setElapsedMs(0);
        resetTranscript();
        baseTextRef.current = valueRef.current;
        try {
            const transcriptionApi = window.stt;
            if (!transcriptionApi) {
                throw new Error('Speech-to-text API is unavailable.');
            }
            if (!(await getAppMicrophoneEnabled())) {
                throw new Error('Microphone recording is disabled in Settings.');
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                },
            });
            setStatus('connecting');
            const session = await transcriptionApi.startRealtime({
                language: preferredLanguage(),
            });
            sessionIdRef.current = session.id;
            const audioContext = new AudioContext({ sampleRate: session.sampleRate });
            const source = audioContext.createMediaStreamSource(mediaStream);
            const processor = audioContext.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1);
            processor.onaudioprocess = (event) => {
                const sessionId = sessionIdRef.current;
                if (!sessionId || mutedRef.current)
                    return;
                const input = event.inputBuffer.getChannelData(0);
                const pcm = resampleToPcm16(input, audioContext.sampleRate, session.sampleRate);
                if (pcm.length === 0)
                    return;
                void transcriptionApi.appendRealtimeAudio(sessionId, pcm16ToBase64(pcm));
            };
            source.connect(processor);
            processor.connect(audioContext.destination);
            await audioContext.resume();
            streamRef.current = mediaStream;
            audioContextRef.current = audioContext;
            sourceRef.current = source;
            processorRef.current = processor;
            setStream(mediaStream);
            setMuted(false);
            setStatus('recording');
            startClock();
            return true;
        }
        catch (error) {
            if (sessionIdRef.current) {
                await window.stt?.cancelRealtime(sessionIdRef.current).catch(() => undefined);
                sessionIdRef.current = null;
            }
            stopClock();
            stopAudio();
            setStatus('error');
            setErrorMessage(dictationErrorMessage(error));
            return false;
        }
    }, [resetTranscript, setMuted, startClock, status, stopAudio, stopClock]);
    const cancel = useCallback(async () => {
        const sessionId = sessionIdRef.current;
        sessionIdRef.current = null;
        stopClock();
        stopAudio();
        onValueChangeRef.current(baseTextRef.current);
        setIsMuted(false);
        mutedRef.current = false;
        setElapsedMs(0);
        setStatus('idle');
        if (sessionId)
            await window.stt?.cancelRealtime(sessionId).catch(() => undefined);
    }, [stopAudio, stopClock]);
    const finish = useCallback(async () => {
        const sessionId = sessionIdRef.current;
        stopClock();
        stopAudio();
        setIsMuted(false);
        mutedRef.current = false;
        setElapsedMs(0);
        if (!sessionId) {
            setStatus('idle');
            return;
        }
        setStatus('finishing');
        try {
            await window.stt?.finishRealtime(sessionId);
        }
        catch (error) {
            sessionIdRef.current = null;
            setStatus('error');
            setErrorMessage(dictationErrorMessage(error));
        }
    }, [stopAudio, stopClock]);
    useEffect(() => {
        return () => {
            const sessionId = sessionIdRef.current;
            sessionIdRef.current = null;
            stopClock();
            stopAudio();
            if (sessionId)
                void window.stt?.cancelRealtime(sessionId).catch(() => undefined);
        };
    }, [stopAudio, stopClock]);
    return {
        cancel,
        elapsedMs,
        errorMessage,
        finish,
        isMuted,
        isSupported: canCaptureAudio(),
        setMuted,
        start,
        status,
        stream,
    };
}
