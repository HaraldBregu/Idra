import type { StoreService } from '../../store';
import type { TaskContext, TaskHandler } from '../../../shared/tasks';

export const OCR_TASK_TYPE = 'ocr.run';

export interface OcrTaskInput {
	imageBase64: string;
	mimeType?: string;
	language?: string;
}

export interface OcrTaskResult {
	text: string;
	raw?: unknown;
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('OCR task input must be an object.');
	}
}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function extractOcrText(payload: unknown): string {
	if (typeof payload === 'string') return payload;
	if (payload && typeof payload === 'object') {
		const record = payload as Record<string, unknown>;
		for (const key of ['text', 'result', 'output']) {
			if (typeof record[key] === 'string') return record[key];
		}
	}
	return JSON.stringify(payload);
}

function abortError(): Error {
	const error = new Error('Task was cancelled.');
	error.name = 'AbortError';
	return error;
}

export class OcrTaskHandler implements TaskHandler<OcrTaskInput, OcrTaskResult> {
	readonly type = OCR_TASK_TYPE;

	constructor(private readonly store: StoreService) {}

	validateInput(input: unknown): OcrTaskInput {
		assertRecord(input);
		const imageBase64 = input.imageBase64;
		if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
			throw new Error('imageBase64 is required.');
		}
		if (imageBase64.length > 16 * 1024 * 1024) {
			throw new Error('imageBase64 is too large.');
		}
		return {
			imageBase64,
			mimeType: optionalString(input, 'mimeType'),
			language: optionalString(input, 'language'),
		};
	}

	async run(context: TaskContext<OcrTaskInput>): Promise<OcrTaskResult> {
		if (context.signal.aborted) throw abortError();

		const endpoint = this.store.getDocumentReaderOcrEndpoint();
		if (!endpoint) throw new Error('OCR service is not configured.');

		context.updateProgress({ message: 'Submitting OCR request' });
		if (context.signal.aborted) throw abortError();
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(context.input),
			signal: context.signal,
		});
		if (context.signal.aborted) throw abortError();
		if (!response.ok) {
			throw new Error(`OCR request failed with status ${response.status}.`);
		}

		const contentType = response.headers.get('content-type') ?? '';
		const raw = contentType.includes('json')
			? ((await response.json()) as unknown)
			: await response.text();
		if (context.signal.aborted) throw abortError();
		const text = extractOcrText(raw);
		context.updateProgress({ message: 'OCR completed' });
		return { text, raw };
	}
}
