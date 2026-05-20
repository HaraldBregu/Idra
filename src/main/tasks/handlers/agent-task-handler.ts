import { DEFAULT_AGENT_ID } from '../../constants';
import type { AgentSendOptions, AgentService } from '../../service';
import {
	isModelReasoningEffort,
	type ModelReasoningEffort,
} from '../../../shared/service';
import type { TaskContext, TaskHandler } from '../../../shared/tasks';

export const AGENT_TASK_TYPE = 'agent.run';

export interface AgentTaskInput {
	message: string;
	agentId?: string;
	sessionId?: string;
	providerId?: string;
	model?: string;
	effort?: ModelReasoningEffort;
	lightContext?: boolean;
	toolsAllow?: string[];
}

export interface AgentTaskResult {
	text: string;
}

function abortError(): Error {
	const error = new Error('Task was cancelled.');
	error.name = 'AbortError';
	return error;
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('Agent task input must be an object.');
	}
}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalBoolean(input: Record<string, unknown>, key: string): boolean | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean.`);
	return value;
}

function optionalToolsAllow(input: Record<string, unknown>): string[] | undefined {
	const value = input.toolsAllow;
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value)) throw new Error('toolsAllow must be an array.');
	return value.map((item) => {
		if (typeof item !== 'string') throw new Error('toolsAllow entries must be strings.');
		return item.trim();
	}).filter(Boolean);
}

export class AgentTaskHandler implements TaskHandler<AgentTaskInput, AgentTaskResult> {
	readonly type = AGENT_TASK_TYPE;

	constructor(private readonly agentService: AgentService) {}

	validateInput(input: unknown): AgentTaskInput {
		assertRecord(input);
		if (typeof input.message !== 'string') {
			throw new Error('message is required.');
		}
		const message = input.message.trim();
		if (!message) throw new Error('message is required.');
		if (message.length > 200_000) throw new Error('message is too long.');

		const effort = input.effort;
		if (effort !== undefined && !isModelReasoningEffort(effort)) {
			throw new Error('effort is invalid.');
		}

		return {
			message,
			agentId: optionalString(input, 'agentId'),
			sessionId: optionalString(input, 'sessionId'),
			providerId: optionalString(input, 'providerId'),
			model: optionalString(input, 'model'),
			effort: effort as ModelReasoningEffort | undefined,
			lightContext: optionalBoolean(input, 'lightContext'),
			toolsAllow: optionalToolsAllow(input),
		};
	}

	async run(context: TaskContext<AgentTaskInput>): Promise<AgentTaskResult> {
		if (context.signal.aborted) throw abortError();

		const input = context.input;
		const agentId = input.agentId ?? DEFAULT_AGENT_ID;
		const sessionId = input.sessionId ?? `task:${context.taskId}`;
		const options: AgentSendOptions = { sessionId };
		if (input.providerId) options.providerId = input.providerId;
		if (input.model) options.model = input.model;
		if (input.effort) options.effort = input.effort;
		if (input.lightContext !== undefined) options.lightContext = input.lightContext;
		if (input.toolsAllow) options.toolsAllow = input.toolsAllow;

		const cancelAgent = (): void => {
			this.agentService.cancel(sessionId);
		};

		context.updateProgress({ message: 'Starting agent' });
		context.signal.addEventListener('abort', cancelAgent, { once: true });
		try {
			const text = await this.agentService.send(input.message, agentId, options);
			if (context.signal.aborted) throw abortError();
			context.updateProgress({ message: 'Agent completed' });
			return { text };
		} catch (error) {
			if (context.signal.aborted) throw abortError();
			throw error;
		} finally {
			context.signal.removeEventListener('abort', cancelAgent);
		}
	}
}
