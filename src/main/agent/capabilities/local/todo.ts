import type { AgentTool, PlanEntry } from './types';
import { jsonResult } from './types';

function stringArg(value: unknown, name: string): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
	return value.trim();
}

function optionalIndex(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined;
	return value;
}

function entryStatus(value: unknown, fallback: PlanEntry['status']): PlanEntry['status'] {
	return value === 'pending' || value === 'in_progress' || value === 'done' ? value : fallback;
}

function findEntry(entries: PlanEntry[], args: Record<string, unknown>): { entry: PlanEntry; index: number } {
	const index = optionalIndex(args.index);
	if (index !== undefined && entries[index]) return { entry: entries[index]!, index };
	const task = typeof args.task === 'string' ? args.task.trim() : '';
	const found = entries.findIndex((entry) => entry.task === task);
	if (found >= 0) return { entry: entries[found]!, index: found };
	throw new Error('todo entry not found.');
}

export const todoCreateTool: AgentTool = {
	name: 'todo_create',
	description: 'Create a local todo entry for the current run.',
	schema: {
		type: 'object',
		required: ['task'],
		properties: {
			task: { type: 'string' },
			status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
		},
	},
	async execute(args, ctx) {
		const entry: PlanEntry = { task: stringArg(args.task, 'task'), status: entryStatus(args.status, 'pending') };
		ctx.plan.entries.push(entry);
		return jsonResult({ index: ctx.plan.entries.length - 1, entry, entries: ctx.plan.entries });
	},
};

export const todoUpdateTool: AgentTool = {
	name: 'todo_update',
	description: 'Update a local todo entry for the current run.',
	schema: {
		type: 'object',
		properties: {
			index: { type: 'number' },
			task: { type: 'string' },
			nextTask: { type: 'string' },
			status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
		},
	},
	async execute(args, ctx) {
		const { entry, index } = findEntry(ctx.plan.entries, args);
		const nextTask = typeof args.nextTask === 'string' && args.nextTask.trim() ? args.nextTask.trim() : entry.task;
		const updated: PlanEntry = { task: nextTask, status: entryStatus(args.status, entry.status) };
		ctx.plan.entries[index] = updated;
		return jsonResult({ index, entry: updated, entries: ctx.plan.entries });
	},
};

export const todoCompleteTool: AgentTool = {
	name: 'todo_complete',
	description: 'Mark a local todo as completed.',
	schema: {
		type: 'object',
		properties: {
			index: { type: 'number' },
			task: { type: 'string' },
		},
	},
	async execute(args, ctx) {
		const { entry, index } = findEntry(ctx.plan.entries, args);
		const updated: PlanEntry = { ...entry, status: 'done' };
		ctx.plan.entries[index] = updated;
		return jsonResult({ index, entry: updated, entries: ctx.plan.entries });
	},
};

export const todoTools = [
	todoCreateTool,
	todoUpdateTool,
	todoCompleteTool,
] as const;
