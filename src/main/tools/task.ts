import type { TaskRecord, TaskRunRequest } from '../../shared/tasks';
import type { AgentTool, AgentToolResult } from './types';
import { textResult } from './types';

interface TaskToolArgs {
	id?: string;
	type: string;
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
	const request: TaskRunRequest = {
		type: requiredString(args, 'type'),
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
		'Start an immediate in-memory background task through a user-facing src/main/tasks handler. Use this tool when the user asks to "run a task in background" or to start a registered task now. It creates one task record and returns that record; it does not schedule future work, run shell background processes, or emulate timers. Use cron for future, delayed, or recurring jobs, and use exec/process only for shell commands.',
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'Optional caller-provided task id.' },
			type: {
				type: 'string',
				description: 'Registered src/main/tasks handler type, for example agent.run or ocr.run.',
			},
			title: { type: 'string', description: 'User-visible title for the background task.' },
			input: {
				description:
					'Input object passed to the registered task handler. For agent.run use { "message": "..." }.',
			},
			metadata: {
				type: 'object',
				additionalProperties: true,
				description: 'Optional metadata stored on the task record after task-manager sanitization.',
			},
		},
		required: ['type', 'title'],
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
