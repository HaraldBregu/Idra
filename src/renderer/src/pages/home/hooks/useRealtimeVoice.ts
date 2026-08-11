import { useCallback, useEffect, useRef, useState } from 'react';
import { providerModels } from '@/lib/providers';
import { useHomeAgentContext } from '../context';
import type {
	RealtimeVoiceEvent,
	RealtimeVoiceState,
	RealtimeVoiceToolEvent,
} from '@shared/realtime_voice';
import {
	base64ToPcm16,
	canCaptureAudio,
	dictationErrorMessage,
	getAppMicrophoneEnabled,
	pcm16ToBase64,
	resampleToPcm16,
	stopStream,
} from './audio';

export type RealtimeVoiceUiStatus =
	| 'idle'
	| 'checking-permission'
	| RealtimeVoiceState
	| 'error';

const AUDIO_BUFFER_SIZE = 4096;
const CLOCK_INTERVAL_MS = 250;
const HOME_AGENT_ID = 'main';

function isToolEvent(event: RealtimeVoiceEvent): event is RealtimeVoiceToolEvent {
	return (
		event.type === 'tool_call_start' ||
		event.type === 'tool_call_args_delta' ||
		event.type === 'tool_call_input' ||
		event.type === 'tool_permission_request' ||
		event.type === 'tool_call_result'
	);
}

function messageId(prefix: string, itemId?: string): string {
	return itemId
		? `${prefix}-${itemId}`
		: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function needsVoiceConfiguration(message: string): boolean {
	return /api key|credential|provider|model|not configured|configuration/i.test(message);
}

export function useRealtimeVoice({
	chatSessionId,
	onClosed,
}: {
	readonly chatSessionId: string;
	readonly onClosed: () => void;
}) {
	const { dispatchChat } = useHomeAgentContext();
	const [status, setStatus] = useState<RealtimeVoiceUiStatus>('idle');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [requiresConfiguration, setRequiresConfiguration] = useState(false);
	const [elapsedMs, setElapsedMs] = useState(0);
	const [isMuted, setIsMuted] = useState(false);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
	const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

	const mountedRef = useRef(true);
	const onClosedRef = useRef(onClosed);
	const sessionIdRef = useRef<string | null>(null);
	const sessionChatIdRef = useRef<string | null>(null);
	const startRunRef = useRef(0);
	const mutedRef = useRef(false);
	const statusRef = useRef<RealtimeVoiceUiStatus>('idle');
	const startedAtMsRef = useRef(0);
	const clockRef = useRef<number | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const inputContextRef = useRef<AudioContext | null>(null);
	const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const inputAnalyserRef = useRef<AnalyserNode | null>(null);
	const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
	const outputContextRef = useRef<AudioContext | null>(null);
	const outputAnalyserRef = useRef<AnalyserNode | null>(null);
	const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
	const nextOutputTimeRef = useRef(0);
	const handledTurnIdsRef = useRef<Set<string>>(new Set());

	const supportedModels = providerModels('openai', 'realtime-voice');
	const isConfigured = supportedModels.length > 0;
	const isSupported = canCaptureAudio();
	const isActive = status !== 'idle' && status !== 'error';
	const analyser = status === 'speaking' ? outputAnalyser : inputAnalyser;

	useEffect(() => {
		onClosedRef.current = onClosed;
	}, [onClosed]);

	useEffect(() => {
		statusRef.current = status;
	}, [status]);

	const stopClock = useCallback((): void => {
		if (clockRef.current === null) return;
		window.clearInterval(clockRef.current);
		clockRef.current = null;
	}, []);

	const stopPlayback = useCallback((): void => {
		for (const source of outputSourcesRef.current) {
			try {
				source.stop();
			} catch {
				// The source may already have ended.
			}
		}
		outputSourcesRef.current.clear();
		nextOutputTimeRef.current = outputContextRef.current?.currentTime ?? 0;
	}, []);

	const releaseAudio = useCallback((): void => {
		stopClock();
		stopPlayback();
		inputProcessorRef.current?.disconnect();
		inputSourceRef.current?.disconnect();
		inputAnalyserRef.current?.disconnect();
		outputAnalyserRef.current?.disconnect();
		inputProcessorRef.current = null;
		inputSourceRef.current = null;
		inputAnalyserRef.current = null;
		outputAnalyserRef.current = null;
		stopStream(streamRef.current);
		streamRef.current = null;
		void inputContextRef.current?.close().catch(() => undefined);
		void outputContextRef.current?.close().catch(() => undefined);
		inputContextRef.current = null;
		outputContextRef.current = null;
		mutedRef.current = false;
		if (mountedRef.current) {
			setStream(null);
			setInputAnalyser(null);
			setOutputAnalyser(null);
			setIsMuted(false);
			setElapsedMs(0);
		}
	}, [stopClock, stopPlayback]);

	const closeSession = useCallback(
		async (notify = true): Promise<void> => {
			startRunRef.current += 1;
			const sessionId = sessionIdRef.current;
			sessionIdRef.current = null;
			sessionChatIdRef.current = null;
			if (mountedRef.current && statusRef.current !== 'error') setStatus('ending');
			releaseAudio();
			if (sessionId) {
				await window.models.realtimeVoice.stopSession(sessionId).catch((error) => {
					if (!mountedRef.current) return;
					const message = dictationErrorMessage(error);
					setErrorMessage(message);
					setRequiresConfiguration(needsVoiceConfiguration(message));
				});
			}
			if (mountedRef.current && statusRef.current !== 'error') setStatus('idle');
			if (notify) onClosedRef.current();
		},
		[releaseAudio]
	);

	const playAudio = useCallback((base64: string): void => {
		const audioContext = outputContextRef.current;
		const outputNode = outputAnalyserRef.current;
		if (!audioContext || !outputNode) return;
		const pcm = base64ToPcm16(base64);
		if (pcm.length === 0) return;
		const buffer = audioContext.createBuffer(1, pcm.length, 24_000);
		const samples = buffer.getChannelData(0);
		for (let index = 0; index < pcm.length; index += 1) {
			samples[index] = (pcm[index] ?? 0) / 0x8000;
		}
		const source = audioContext.createBufferSource();
		source.buffer = buffer;
		source.connect(outputNode);
		const startAt = Math.max(audioContext.currentTime, nextOutputTimeRef.current);
		nextOutputTimeRef.current = startAt + buffer.duration;
		outputSourcesRef.current.add(source);
		source.onended = () => outputSourcesRef.current.delete(source);
		source.start(startAt);
	}, []);

	useEffect(() => {
		return window.models.realtimeVoice.onSessionEvent((event: RealtimeVoiceEvent) => {
			const sessionId = sessionIdRef.current;
			if (!sessionId || event.sessionId !== sessionId) return;

			if (isToolEvent(event)) {
				dispatchChat({
					type: 'apply_response_event',
					event,
					receivedAtMs: Date.now(),
				});
				return;
			}

			switch (event.type) {
				case 'started':
					setStatus('listening');
					return;
				case 'state':
					setStatus(event.status);
					return;
				case 'input_speech_started':
					if (statusRef.current === 'speaking' || outputSourcesRef.current.size > 0) {
						stopPlayback();
						void window.models.realtimeVoice.interruptSession(sessionId).catch(() => undefined);
					}
					setStatus('listening');
					return;
				case 'input_speech_stopped':
					setStatus('thinking');
					return;
				case 'user_turn': {
					const turnKey = event.itemId ?? `turn-${handledTurnIdsRef.current.size}`;
					if (handledTurnIdsRef.current.has(turnKey)) return;
					handledTurnIdsRef.current.add(turnKey);
					dispatchChat({
						type: 'start_voice_turn',
						userMessageId: messageId('voice-user', event.itemId),
						agentMessageId: messageId('voice-agent', event.itemId),
						runId: event.sessionId,
						content: event.transcript?.trim() || 'Voice message',
					});
					return;
				}
				case 'assistant_transcript_delta':
					dispatchChat({
						type: 'apply_response_event',
						event: {
							type: 'text_delta',
							delta: event.delta,
							agentId: HOME_AGENT_ID,
							runId: event.sessionId,
						},
						receivedAtMs: Date.now(),
					});
					return;
				case 'assistant_transcript_final':
					dispatchChat({ type: 'complete_active', response: event.text, completedAtMs: Date.now() });
					return;
				case 'assistant_audio_delta':
					setStatus('speaking');
					playAudio(event.audio);
					return;
				case 'assistant_audio_done':
					return;
				case 'interrupted':
					stopPlayback();
					dispatchChat({ type: 'complete_active', response: '', completedAtMs: Date.now() });
					setStatus('listening');
					return;
				case 'error': {
					const message = event.message || 'Realtime voice conversation failed.';
					sessionIdRef.current = null;
					setErrorMessage(message);
					setRequiresConfiguration(needsVoiceConfiguration(message));
					setStatus('error');
					dispatchChat({ type: 'error_active', errorText: message, completedAtMs: Date.now() });
					releaseAudio();
					void window.models.realtimeVoice.stopSession(sessionId).catch(() => undefined);
					onClosedRef.current();
					return;
				}
				case 'closed':
					sessionIdRef.current = null;
					dispatchChat({ type: 'complete_active', response: '', completedAtMs: Date.now() });
					releaseAudio();
					setStatus('idle');
					onClosedRef.current();
					return;
			}
		});
	}, [dispatchChat, playAudio, releaseAudio, stopPlayback]);

	const setMuted = useCallback((nextMuted: boolean): void => {
		mutedRef.current = nextMuted;
		setIsMuted(nextMuted);
		streamRef.current?.getAudioTracks().forEach((track) => {
			track.enabled = !nextMuted;
		});
	}, []);

	const start = useCallback(async (): Promise<boolean> => {
		if (sessionIdRef.current) return true;
		setErrorMessage(null);
		setRequiresConfiguration(false);
		if (!isConfigured) {
			setErrorMessage('Configure a supported realtime voice provider and model in Settings.');
			setRequiresConfiguration(true);
			setStatus('error');
			return false;
		}
		if (!isSupported) {
			setErrorMessage('Realtime voice is not supported in this environment.');
			setStatus('error');
			return false;
		}

		const runId = startRunRef.current + 1;
		startRunRef.current = runId;
		setStatus('checking-permission');
		setElapsedMs(0);
		handledTurnIdsRef.current = new Set();

		try {
			if (!(await getAppMicrophoneEnabled())) {
				throw new Error('Microphone recording is disabled in Settings.');
			}
			if (startRunRef.current !== runId) return false;

			const outputContext = new AudioContext({ sampleRate: 24_000 });
			const outputNode = outputContext.createAnalyser();
			outputNode.fftSize = 512;
			outputNode.smoothingTimeConstant = 0.72;
			outputNode.connect(outputContext.destination);
			outputContextRef.current = outputContext;
			outputAnalyserRef.current = outputNode;
			setOutputAnalyser(outputNode);
			await outputContext.resume();

			const mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
			});
			if (startRunRef.current !== runId) {
				stopStream(mediaStream);
				releaseAudio();
				return false;
			}

			setStatus('connecting');
			const session = await window.models.realtimeVoice.startSession({ chatSessionId });
			if (startRunRef.current !== runId) {
				stopStream(mediaStream);
				await window.models.realtimeVoice.stopSession(session.id).catch(() => undefined);
				releaseAudio();
				return false;
			}

			const inputContext = new AudioContext();
			const source = inputContext.createMediaStreamSource(mediaStream);
			const inputNode = inputContext.createAnalyser();
			inputNode.fftSize = 512;
			inputNode.smoothingTimeConstant = 0.72;
			const processor = inputContext.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1);
			processor.onaudioprocess = (event): void => {
				const activeSessionId = sessionIdRef.current;
				if (!activeSessionId || mutedRef.current) return;
				const input = event.inputBuffer.getChannelData(0);
				const pcm = resampleToPcm16(input, inputContext.sampleRate, session.input.sampleRate);
				if (pcm.length === 0) return;
				void window.models.realtimeVoice
					.appendAudio(activeSessionId, pcm16ToBase64(pcm))
					.catch(() => undefined);
			};
			source.connect(inputNode);
			source.connect(processor);
			processor.connect(inputContext.destination);
			await inputContext.resume();

			sessionIdRef.current = session.id;
			sessionChatIdRef.current = chatSessionId;
			streamRef.current = mediaStream;
			inputContextRef.current = inputContext;
			inputSourceRef.current = source;
			inputAnalyserRef.current = inputNode;
			inputProcessorRef.current = processor;
			setStream(mediaStream);
			setInputAnalyser(inputNode);
			setMuted(false);
			setStatus('listening');
			startedAtMsRef.current = Date.now();
			clockRef.current = window.setInterval(() => {
				setElapsedMs(Date.now() - startedAtMsRef.current);
			}, CLOCK_INTERVAL_MS);
			return true;
		} catch (error) {
			releaseAudio();
			const message = dictationErrorMessage(error);
			setErrorMessage(message);
			setRequiresConfiguration(needsVoiceConfiguration(message));
			setStatus('error');
			return false;
		}
	}, [chatSessionId, isConfigured, isSupported, releaseAudio, setMuted]);

	useEffect(() => {
		return () => {
			if (sessionChatIdRef.current === chatSessionId) void closeSession();
		};
	}, [chatSessionId, closeSession]);

	useEffect(() => {
		return () => {
			mountedRef.current = false;
			startRunRef.current += 1;
			const sessionId = sessionIdRef.current;
			sessionIdRef.current = null;
			releaseAudio();
			if (sessionId) void window.models.realtimeVoice.stopSession(sessionId).catch(() => undefined);
		};
	}, [releaseAudio]);

	return {
		analyser,
		elapsedMs,
		end: closeSession,
		errorMessage,
		isActive,
		isConfigured,
		isMuted,
		isSupported,
		requiresConfiguration,
		setMuted,
		start,
		status,
		stream,
	};
}
