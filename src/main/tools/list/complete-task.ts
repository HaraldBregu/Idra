import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { renderTodos } from './internal/render-todos';
import { todoIndex } from './internal/todo-index';

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
