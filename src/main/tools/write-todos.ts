import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';
import { readTodoEntry } from './read-todo-entry';
import { renderTodos } from './render-todos';
import type { TodoInput } from './state-types';

export const writeTodosTool: AgentTool<{ todos: TodoInput[] }> = {
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
