import type { AgentTool } from '../../base/tool';
import { textResult } from '../../base/tool';
import { toolDescription } from '../../base/metadata';
import { renderTodos } from './render-todos';
import { todoIndex } from './todo-index';
import type { TodoStatus } from './types';

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
