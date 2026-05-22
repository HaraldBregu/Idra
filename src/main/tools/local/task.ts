import type { TaskRecord, TaskRunRequest } from '../../../shared/tasks';
import { AGENT_TASK_TYPE } from '../../tasks';
import type { AgentTool, AgentToolResult } from '../core/types';
import { textResult } from '../core/types';

interface TaskToolArgs {
	id?: string;
	type?: string;
	title: string;
	input?: unknown;
	metadata?: Record<string, unknown>;
}

function assertRecord(value: unknown, name: string): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${name} must be an object.`);
	}
}

function requiredString(input: Record<string, unknown>, key: string): string {
	const value = input[key];
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${key} is required.`);
	return trimmed;
}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalMetadata(value: unknown): Record<string, unknown> | undefined {
	if (value === undefined || value === null) return undefined;
	assertRecord(value, 'metadata');
	return value;
}

function taskRequest(args: unknown): TaskRunRequest {
	assertRecord(args, 'task arguments');
	const type = optionalString(args, 'type');
	if (type && type !== AGENT_TASK_TYPE) {
		throw new Error(`Only ${AGENT_TASK_TYPE} background tasks are supported.`);
	}
	const request: TaskRunRequest = {
		type: AGENT_TASK_TYPE,
		title: requiredString(args, 'title'),
		input: Object.prototype.hasOwnProperty.call(args, 'input') ? args.input : {},
	};
	const id = optionalString(args, 'id');
	const metadata = optionalMetadata(args.metadata);
	if (id) request.id = id;
	if (metadata) request.metadata = metadata;
	return request;
}

function taskRecordResult(task: TaskRecord): AgentToolResult<TaskRecord> {
	return {
		status: 'ok',
		content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
		details: task,
	};
}

export const taskTool: AgentTool<TaskToolArgs> = {
	name: 'task',
	displaySummary: 'Start an immediate background task.',
	description:
		'Start an immediate in-memory agent background task. Use this tool when the user asks to run agent work in the background now. It creates one task record and returns that record; it does not schedule future work, run shell background processes, or emulate timers. Use cron for future, delayed, or recurring jobs, and use exec/process only for shell commands.',
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'Optional caller-provided task id.' },
			type: {
				type: 'string',
				enum: [AGENT_TASK_TYPE],
				description: `Background task type. Only ${AGENT_TASK_TYPE} is supported.`,
			},
			title: { type: 'string', description: 'User-visible title for the background task.' },
			input: {
				description:
					'Agent instruction input. Use { "message": "..." }; provider, model, credentials, and session settings come from app configuration.',
			},
			metadata: {
				type: 'object',
				additionalProperties: true,
				description: 'Optional metadata stored on the task record after task-manager sanitization.',
			},
		},
		required: ['title'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const taskManager = ctx.services.taskManager;
		if (!taskManager) return textResult('task: TaskManager service is not available.', true);

		try {
			const task = taskManager.startUserTask(taskRequest(args));
			return taskRecordResult(task);
		} catch (error) {
			return textResult(`task: ${error instanceof Error ? error.message : String(error)}`, true);
		}
	},
};
