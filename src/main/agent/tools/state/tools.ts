import type { AgentTool, PlanEntry, ToolContext } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';

const scratchByContext = new WeakMap<ToolContext, string>();

type TodoStatus = PlanEntry['status'];

export const writeTodosTool: AgentTool<{ todos: Array<string | { task?: string; status?: TodoStatus }> }> = {
	name: 'write_todos',
	description: toolDescription('write_todos'),
	schema: {
		type: 'object',
		properties: {
			todos: {
				type: 'array',
				items: {
					anyOf: [
						{ type: 'string' },
						{
							type: 'object',
							properties: {
								task: { type: 'string' },
								status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
							},
							additionalProperties: false,
						},
					],
				},
			},
		},
		required: ['todos'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		if (!Array.isArray(args.todos)) return textResult('write_todos: todos must be an array.', true);
		const entries = args.todos.map(readTodoEntry);
		ctx.plan.entries.splice(0, ctx.plan.entries.length, ...entries);
		return textResult(renderTodos(ctx.plan.entries));
	},
};

export const updateTodoTool: AgentTool<{
	index?: number;
	task?: string;
	text?: string;
	status?: TodoStatus;
}> = {
	name: 'update_todo',
	description: toolDescription('update_todo'),
	schema: {
		type: 'object',
		properties: {
			index: { type: 'number', description: '1-based todo index.' },
			task: { type: 'string', description: 'Existing todo text to match.' },
			text: { type: 'string', description: 'Replacement todo text.' },
			status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const index = todoIndex(ctx.plan.entries, args.index, args.task);
		if (index < 0) return textResult('update_todo: todo not found.', true);
		const current = ctx.plan.entries[index]!;
		ctx.plan.entries[index] = {
			task: args.text?.trim() || current.task,
			status: args.status ?? current.status,
		};
		return textResult(renderTodos(ctx.plan.entries));
	},
};

export const listTodosTool: AgentTool = {
	name: 'list_todos',
	description: toolDescription('list_todos'),
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	async execute(_args, ctx) {
		return textResult(renderTodos(ctx.plan.entries));
	},
};

export const completeTaskTool: AgentTool<{ index?: number; task?: string; summary?: string }> = {
	name: 'complete_task',
	description: toolDescription('complete_task'),
	schema: {
		type: 'object',
		properties: {
			index: { type: 'number', description: '1-based todo index.' },
			task: { type: 'string', description: 'Todo text to match.' },
			summary: { type: 'string' },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const index = todoIndex(ctx.plan.entries, args.index, args.task);
		if (index >= 0) {
			ctx.plan.entries[index] = { ...ctx.plan.entries[index]!, status: 'done' };
			return textResult(renderTodos(ctx.plan.entries));
		}
		if (args.summary?.trim()) return textResult(`completed: ${args.summary.trim()}`);
		return textResult('complete_task: todo not found.', true);
	},
};

export const writeScratchTool: AgentTool<{ content: string; append?: boolean }> = {
	name: 'write_scratch',
	description: toolDescription('write_scratch'),
	schema: {
		type: 'object',
		properties: {
			content: { type: 'string' },
			append: { type: 'boolean' },
		},
		required: ['content'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const current = scratchByContext.get(ctx) ?? '';
		const next = args.append && current ? `${current}\n${args.content}` : args.content;
		scratchByContext.set(ctx, next);
		return textResult(`scratch updated (${next.length} chars)`);
	},
};

export const readScratchTool: AgentTool = {
	name: 'read_scratch',
	description: toolDescription('read_scratch'),
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	async execute(_args, ctx) {
		return textResult(scratchByContext.get(ctx) || '(empty)');
	},
};

function readTodoEntry(value: string | { task?: string; status?: TodoStatus }): PlanEntry {
	if (typeof value === 'string') return { task: requireTask(value), status: 'pending' };
	return {
		task: requireTask(value.task),
		status: value.status ?? 'pending',
	};
}

function requireTask(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error('todo task is required.');
	return value.trim();
}

function todoIndex(entries: PlanEntry[], index?: number, task?: string): number {
	if (typeof index === 'number' && Number.isFinite(index)) {
		const next = Math.floor(index) - 1;
		return next >= 0 && next < entries.length ? next : -1;
	}
	const target = task?.trim();
	return target ? entries.findIndex((entry) => entry.task === target) : -1;
}

function renderTodos(entries: PlanEntry[]): string {
	if (entries.length === 0) return 'No todos.';
	return entries
		.map((entry, index) => `${index + 1}. [${entry.status}] ${entry.task}`)
		.join('\n');
}
