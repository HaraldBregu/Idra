import type { TaskHandler, Emit } from '../task-handler';
import type { LoggerService } from '../../logger';
import type { ServiceResolver } from '../../shared/service-resolver';
import type { ModelResolver } from '../../shared/model-resolver';
import { streamChatTask } from './stream-chat-task';
import SYSTEM_PROMPT from './content-writer-system.md?raw';

export interface ContentWriterTaskInput {
	prompt: string;
	/** Optional overrides; default to whatever ServiceResolver/ModelResolver pick. */
	providerId?: string;
	modelId?: string;
}

export interface ContentWriterTaskHandlerDeps {
	serviceResolver: ServiceResolver;
	modelResolver: ModelResolver;
	logger: LoggerService;
}

const LOG_SOURCE = 'ContentWriterTaskHandler';

/**
 * Task handler that streams content-writer model output as TaskEvents for the renderer.
 *
 * Event mapping:
 *   model text delta -> task `running: <token>` ({success: true, data})
 *
 * Lifecycle events (`queued`, `started`, `finished`, `cancelled`) are emitted
 * by the TaskExecutor — handlers must not emit them, otherwise consumers see
 * duplicate events.
 */
export class ContentWriterTaskHandler
	implements TaskHandler<ContentWriterTaskInput, string>
{
	readonly type = 'content-writer';

	constructor(private readonly deps: ContentWriterTaskHandlerDeps) {}

	async execute(
		input: ContentWriterTaskInput,
		signal: AbortSignal,
		emit: Emit
	): Promise<string> {
		const { serviceResolver, modelResolver, logger } = this.deps;

		logger.info(LOG_SOURCE, 'Content-writer task started', {
			promptLength: input.prompt.length,
		});

		const emitRunning = (token: string): void => {
			emit({ state: 'running', data: { success: true, data: token } });
		};

		try {
			const service = serviceResolver.resolve(
				input.providerId ? { providerId: input.providerId } : undefined
			);
			const model = modelResolver.resolve(
				input.modelId || service.model ? { modelId: input.modelId || service.model } : undefined
			);

			const output = await streamChatTask(
				{
					providerId: service.id,
					apiKey: service.apiKey,
					modelName: model.modelId,
					systemPrompt: SYSTEM_PROMPT,
					userPrompt: input.prompt,
					onDelta: emitRunning,
				},
				signal
			);

			logger.info(LOG_SOURCE, 'Content-writer task finished', {
				length: output.length,
			});

			return output;
		} catch (err) {
			// Aborts are user-initiated, not errors — log neutrally.
			// `DOMException` is not always an `Error` subclass under the test
			// runtime, so check the name property directly rather than via
			// `instanceof`.
			const name =
				err && typeof err === 'object' ? (err as { name?: unknown }).name : undefined;
			if (name === 'AbortError') {
				logger.info(LOG_SOURCE, 'Content-writer task aborted');
				throw err;
			}

			const message = err instanceof Error ? err.message : String(err);
			logger.error(LOG_SOURCE, 'Content-writer task failed', { error: message });
			throw err;
		}
	}
}
