import type { TaskHandler } from '../../shared/tasks';

const TASK_TYPE_PATTERN = /^[a-zA-Z0-9._:-]+$/;

function normalizeTaskType(type: string): string {
	const value = type.trim();
	if (!value) throw new Error('Task type is required.');
	if (value.length > 128) throw new Error('Task type is too long.');
	if (!TASK_TYPE_PATTERN.test(value)) {
		throw new Error(`Invalid task type: ${type}`);
	}
	return value;
}

export class TaskRegistry {
	private readonly handlers = new Map<string, TaskHandler>();

	register(handler: TaskHandler): void {
		const type = normalizeTaskType(handler.type);
		if (this.handlers.has(type)) {
			throw new Error(`Task handler already registered: ${type}`);
		}
		this.handlers.set(type, { ...handler, type });
	}

	require(type: string): TaskHandler {
		const normalized = normalizeTaskType(type);
		const handler = this.handlers.get(normalized);
		if (!handler) throw new Error(`Unknown task type: ${normalized}`);
		return handler;
	}

	has(type: string): boolean {
		return this.handlers.has(normalizeTaskType(type));
	}

	listTypes(): string[] {
		return [...this.handlers.keys()];
	}
}
