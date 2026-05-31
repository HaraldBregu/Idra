import type { EventBus } from '../../core/event-bus';
import type { AgentService } from '../service';
import type { TaskContext, TaskHandler } from '../../../shared/tasks';
import { isModelReasoningEffort } from '../../../shared/agents/service';
import type { SubagentRegistry } from './registry';
import type { SubagentRunTaskInput, SubagentRunTaskResult } from './types';

export const SUBAGENT_RUN_TASK_TYPE = 'subagent.run';

type SubagentTaskAgentService = Pick<AgentService, 'send' | 'cancel'>;

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('Subagent task input must be an object.');
	}
}

function requiredString(input: Record<string, unknown>, key: string): string {
	const value = input[key];
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} is required.`);
	return value.trim();
}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	return value.trim() || undefined;
}

function optionalStringList(input: Record<string, unknown>, key: string): string[] | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value)) throw new Error(`${key} must be an array.`);
	const list = value.flatMap((item) =>
		typeof item === 'string' && item.trim() ? [item.trim()] : []
	);
	return list.length > 0 ? list : undefined;
}

function optionalPositiveInteger(input: Record<string, unknown>, key: string): number | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`${key} must be a positive integer.`);
	}
	return value;
}

function optionalModelReasoningEffort(
	input: Record<string, unknown>,
	key: string
): SubagentRunTaskInput['effort'] {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (isModelReasoningEffort(value)) return value;
	throw new Error(`${key} must be a supported reasoning effort.`);
}

function taskCancelledError(message = 'Task was cancelled.'): Error {
	const error = new Error(message);
	error.name = 'AbortError';
	return error;
}

export class SubagentRunTaskHandler implements TaskHandler<
	SubagentRunTaskInput,
	SubagentRunTaskResult
> {
	readonly type = SUBAGENT_RUN_TASK_TYPE;

	constructor(
		private readonly agentService: SubagentTaskAgentService,
		private readonly registry: SubagentRegistry,
		private readonly eventBus?: EventBus
	) {}

	validateInput(input: unknown): SubagentRunTaskInput {
		assertRecord(input);
		const sessionMetadata = input.sessionMetadata;
		assertRecord(sessionMetadata);
		return {
			runId: requiredString(input, 'runId'),
			task: requiredString(input, 'task'),
			agentId: requiredString(input, 'agentId'),
			childSessionKey: requiredString(input, 'childSessionKey'),
			requesterSessionKey: requiredString(input, 'requesterSessionKey'),
			controllerSessionKey: requiredString(input, 'controllerSessionKey'),
			providerId: optionalString(input, 'providerId'),
			modelId: optionalString(input, 'modelId'),
			effort: optionalModelReasoningEffort(input, 'effort'),
			runTimeoutSeconds: optionalPositiveInteger(input, 'runTimeoutSeconds'),
			toolsAllow: optionalStringList(input, 'toolsAllow'),
			toolsDeny: optionalStringList(input, 'toolsDeny'),
			sessionMetadata: {
				...sessionMetadata,
				agentId: requiredString(sessionMetadata, 'agentId'),
			},
		};
	}

	async run(context: TaskContext<SubagentRunTaskInput>): Promise<SubagentRunTaskResult> {
		if (context.signal.aborted) throw taskCancelledError();

		const input = context.input;
		const started = this.registry.startSubagentRun(input.runId);
		this.eventBus?.emit('subagent:started', started);

		const cancelAgent = (): void => {
			this.agentService.cancel(input.childSessionKey);
		};
		let timedOut = false;
		const timeout =
			input.runTimeoutSeconds && input.runTimeoutSeconds > 0
				? setTimeout(() => {
						timedOut = true;
						cancelAgent();
					}, input.runTimeoutSeconds * 1000)
				: undefined;

		context.updateProgress({ message: 'Starting subagent' });
		context.signal.addEventListener('abort', cancelAgent, { once: true });
		try {
			const text = await this.agentService.send(input.task, input.agentId, {
				sessionId: input.childSessionKey,
				providerId: input.providerId,
				model: input.modelId,
				effort: input.effort,
				toolsAllow: input.toolsAllow,
				toolsDeny: input.toolsDeny,
				sessionMetadata: input.sessionMetadata,
			});
			if (timedOut) throw new Error('Subagent run timed out.');
			if (context.signal.aborted) throw taskCancelledError();
			const completed = this.registry.completeSubagentRun(input.runId, 'ok');
			this.eventBus?.emit('subagent:completed', completed);
			context.updateProgress({ message: 'Subagent completed' });
			return { runId: input.runId, childSessionKey: input.childSessionKey, text };
		} catch (error) {
			if (context.signal.aborted) {
				const cancelled = this.registry.completeSubagentRun(input.runId, 'cancelled', {
					error: error instanceof Error ? error.message : String(error),
				});
				this.eventBus?.emit('subagent:completed', cancelled);
				throw taskCancelledError();
			}
			if (timedOut) {
				const timeoutRun = this.registry.completeSubagentRun(input.runId, 'timeout', {
					error: error instanceof Error ? error.message : String(error),
				});
				this.eventBus?.emit('subagent:completed', timeoutRun);
				throw error;
			}
			const failed = this.registry.completeSubagentRun(input.runId, 'error', {
				error: error instanceof Error ? error.message : String(error),
			});
			this.eventBus?.emit('subagent:completed', failed);
			throw error;
		} finally {
			if (timeout) clearTimeout(timeout);
			context.signal.removeEventListener('abort', cancelAgent);
		}
	}
}
