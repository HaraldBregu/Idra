import type { AgentTool } from '../../core/tool';
import { textResult } from '../../core/tool';
import { readTodoEntry } from '../shared/read-todo-entry';
import { renderTodos } from '../shared/render-todos';
import type { TodoInput } from '../shared/state-types';

export const writeTodosTool: AgentTool<{ todos: TodoInput[] }> = {
	name: 'write_todos',
	description: 'Replace the current run todo list.',
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
