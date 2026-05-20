import type { TaskRecord, TaskRunRequest } from '../../shared/tasks';
import type { AgentTool, AgentToolResult } from './types';

type TaskToolAction = 'start' | 'list' | 'get' | 'cancel';

interface TaskToolArgs {
	action: TaskToolAction;
	id?: string;
	request?: TaskRunRequest;
}

type TaskToolResponse =
	| { status: 'ok'; action: 'start'; task: TaskRecord }
	| { status: 'ok'; action: 'list'; tasks: TaskRecord[] }
	| { status: 'ok'; action: 'get'; task: TaskRecord | null }
	| { status: 'ok'; action: 'cancel'; task: TaskRecord }
	| { status: 'error'; action?: TaskToolAction; error: string };

function jsonResult(payload: TaskToolResponse): AgentToolResult<TaskToolResponse> {
	return {
		status: payload.status,
		content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

function taskError(error: string, action?: TaskToolAction): AgentToolResult<TaskToolResponse> {
	return jsonResult(action ? { status: 'error', action, error } : { status: 'error', error });
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, name: string): string | Error {
	if (typeof value !== 'string') return new Error(`${name} must be a string.`);
	const trimmed = value.trim();
	return trimmed ? trimmed : new Error(`${name} is required.`);
}

function optionalStringField(value: unknown, name: string): string | Error | undefined {
	if (value === undefined) return undefined;
	return stringField(value, name);
}

function parseStartRequest(value: unknown): TaskRunRequest | Error {
	if (!isRecord(value)) return new Error('Task request is required for start.');
	const type = stringField(value.type, 'Task type');
	if (type instanceof Error) return type;
	const title = stringField(value.title, 'Task title');
	if (title instanceof Error) return title;
	if (!Object.prototype.hasOwnProperty.call(value, 'input')) {
		return new Error('Task input is required.');
	}

	const id = optionalStringField(value.id, 'Task id');
	if (id instanceof Error) return id;
	if (value.metadata !== undefined && !isRecord(value.metadata)) {
		return new Error('Task metadata must be an object.');
	}

	return {
		...(id ? { id } : {}),
		type,
		title,
		input: value.input,
		...(value.metadata ? { metadata: value.metadata } : {}),
	};
}

function requireId(value: unknown): string | Error {
	return stringField(value, 'Task id');
}

export const taskTool: AgentTool<TaskToolArgs, TaskToolResponse> = {
	name: 'task',
	displaySummary: 'Start, list, retrieve, and cancel active in-memory tasks.',
	description:
		'Manage active in-memory task records. Use this for starting an approved task type, checking current task records, retrieving one task record, or requesting cooperative cancellation.',
	schema: {
		type: 'object',
		properties: {
			action: { type: 'string', enum: ['start', 'list', 'get', 'cancel'] },
			id: { type: 'string', description: 'Task id for get and cancel.' },
			request: {
				type: 'object',
				description: 'TaskRunRequest for action=start.',
				properties: {
					id: { type: 'string' },
					type: { type: 'string' },
					title: { type: 'string' },
					input: {},
					metadata: { type: 'object', additionalProperties: true },
				},
				required: ['type', 'title', 'input'],
				additionalProperties: false,
			},
		},
		required: ['action'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const action = args.action;
		if (!['start', 'list', 'get', 'cancel'].includes(action)) {
			return taskError(`task: unsupported action ${String(action)}`);
		}
		const taskManager = ctx.services.taskManager;
		if (!taskManager) return taskError('task: task manager service is unavailable.', action);

		try {
			switch (action) {
				case 'start': {
					const request = parseStartRequest(args.request);
					if (request instanceof Error) return taskError(`task: ${request.message}`, action);
					return jsonResult({
						status: 'ok',
						action,
						task: taskManager.startUserTask(request),
					});
				}
				case 'list':
					return jsonResult({ status: 'ok', action, tasks: taskManager.list() });
				case 'get': {
					const id = requireId(args.id);
					if (id instanceof Error) return taskError(`task: ${id.message}`, action);
					return jsonResult({ status: 'ok', action, task: taskManager.get(id) ?? null });
				}
				case 'cancel': {
					const id = requireId(args.id);
					if (id instanceof Error) return taskError(`task: ${id.message}`, action);
					return jsonResult({ status: 'ok', action, task: taskManager.cancel(id) });
				}
			}
		} catch (error) {
			return taskError(`task: ${error instanceof Error ? error.message : String(error)}`, action);
		}
	},
};
