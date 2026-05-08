import { createChatModel } from '../../shared/chat-model-factory';

const DEFAULT_PER_CALL_TIMEOUT_MS = 90_000;

export interface StreamChatTaskParams {
	providerId: string;
	apiKey: string;
	modelName: string;
	systemPrompt: string;
	userPrompt: string;
	temperature?: number;
	maxTokens?: number;
	perCallTimeoutMs?: number;
	onDelta: (delta: string) => void;
}

export async function streamChatTask(
	params: StreamChatTaskParams,
	signal: AbortSignal
): Promise<string> {
	validateParams(params);

	const merged = withTimeout(signal, params.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS);
	try {
		const model = createChatModel({
			providerId: params.providerId,
			apiKey: params.apiKey,
			modelName: params.modelName,
			streaming: true,
			temperature: params.temperature,
			maxTokens: params.maxTokens,
		});

		let content = '';
		for await (const delta of model.stream(
			[
				{ role: 'system', content: params.systemPrompt },
				{ role: 'user', content: params.userPrompt },
			],
			merged.signal
		)) {
			if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
			content += delta;
			params.onDelta(delta);
		}
		return content;
	} finally {
		merged.clear();
	}
}

function validateParams(params: StreamChatTaskParams): void {
	if (!params.userPrompt.trim()) throw new Error('prompt required');
	if (!params.providerId.trim()) throw new Error('providerId required');
	if (!params.apiKey.trim()) throw new Error('apiKey required');
	if (!params.modelName.trim()) throw new Error('modelName required');
}

function withTimeout(
	signal: AbortSignal,
	timeoutMs: number
): { signal: AbortSignal; clear: () => void } {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = (): void => controller.abort(signal.reason);
	if (signal.aborted) controller.abort(signal.reason);
	else signal.addEventListener('abort', onAbort, { once: true });
	return {
		signal: controller.signal,
		clear: (): void => {
			clearTimeout(timer);
			signal.removeEventListener('abort', onAbort);
		},
	};
}
