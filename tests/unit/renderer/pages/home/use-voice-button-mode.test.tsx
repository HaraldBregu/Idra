import { renderHook, waitFor } from '@testing-library/react';
import { useVoiceButtonMode } from '../../../../../src/renderer/src/pages/home/hooks';
import {
	DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
	XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
} from '../../../../../src/shared/provider-models';

const originalApp = (window as Window & { app?: Window['app'] }).app;

function defineApp(value: Partial<Window['app']> | undefined): void {
	Object.defineProperty(window, 'app', {
		configurable: true,
		value,
	});
}

function speechToTextOperator(providerId: string, modelId: string): Awaited<
	ReturnType<Window['app']['getSpeechToTextOperator']>
> {
	return {
		id: 'speech-to-text',
		name: 'Speech to text',
		docsPath: 'models/speech-to-text.md',
		status: 'implemented',
		provider: {
			id: providerId,
			name: providerId,
			baseUrl: '',
		},
		model: {
			id: modelId,
			name: modelId,
		},
	};
}

describe('useVoiceButtonMode', () => {
	afterEach(() => {
		defineApp(originalApp);
	});

	it('uses dictation mode for realtime speech-to-text models', async () => {
		defineApp({
			getSpeechToTextOperator: jest.fn(async () =>
				speechToTextOperator('deepgram', DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID)
			),
		});

		const { result } = renderHook(() => useVoiceButtonMode());

		await waitFor(() => expect(result.current).toBe('dictate'));
	});

	it('uses recording mode for batch speech-to-text models', async () => {
		defineApp({
			getSpeechToTextOperator: jest.fn(async () =>
				speechToTextOperator('xai', XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID)
			),
		});

		const { result } = renderHook(() => useVoiceButtonMode());

		await waitFor(() => expect(result.current).toBe('record'));
	});
});
