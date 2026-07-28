import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH_MAX_TEXT_LENGTH } from '@shared/speech_types';
import { markdownToPlainText } from '@/lib/plain';

function synthesisErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return 'Speech synthesis failed.';
}

async function playSpeechAudio(mimeType: string, base64: string): Promise<void> {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
	const audio = new Audio(url);
	try {
		await new Promise<void>((resolve, reject) => {
			audio.onended = () => resolve();
			audio.onerror = () => reject(new Error('Audio playback failed.'));
			void audio.play().catch(reject);
		});
	} finally {
		URL.revokeObjectURL(url);
	}
}

export function useReadMessageAloud(): {
	readonly speak: (markdown: string) => void;
	readonly isSpeaking: boolean;
	readonly errorMessage: string | null;
	readonly clearError: () => void;
} {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const speakingRef = useRef(false);
	const runIdRef = useRef(0);

	const clearError = useCallback((): void => {
		setErrorMessage(null);
	}, []);

	const speak = useCallback((markdown: string): void => {
		const text = markdownToPlainText(markdown).slice(0, SPEECH_MAX_TEXT_LENGTH);
		if (!text || speakingRef.current) return;

		const voiceApi = window.models.voice;
		if (!voiceApi?.synthesize) {
			setErrorMessage('Voice API is unavailable.');
			return;
		}

		const runId = runIdRef.current + 1;
		runIdRef.current = runId;
		speakingRef.current = true;
		setIsSpeaking(true);
		setErrorMessage(null);

		void (async () => {
			try {
				const result = await voiceApi.synthesize({ text });
				if (runIdRef.current !== runId) return;
				await playSpeechAudio(result.mimeType, result.audio);
			} catch (error) {
				if (runIdRef.current === runId) {
					setErrorMessage(synthesisErrorMessage(error));
				}
			} finally {
				if (runIdRef.current === runId) {
					speakingRef.current = false;
					setIsSpeaking(false);
				}
			}
		})();
	}, []);

	useEffect(() => {
		return () => {
			runIdRef.current += 1;
			speakingRef.current = false;
		};
	}, []);

	return { speak, isSpeaking, errorMessage, clearError };
}
