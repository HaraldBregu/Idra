import type { TaskHandler } from '../../shared/tasks';

const TASK_TYPE_PATTERN = /^[a-zA-Z0-9._:-]+$/;

export interface TaskRegistrationOptions {
	userFacing?: boolean;
}

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
	private readonly userFacingTypes = new Set<string>();

	register(handler: TaskHandler, options: TaskRegistrationOptions = {}): void {
		const type = normalizeTaskType(handler.type);
		if (handler.type !== type) {
			throw new Error(`Task handler type must be normalized: ${handler.type}`);
		}
		if (this.handlers.has(type)) {
			throw new Error(`Task handler already registered: ${type}`);
		}
		this.handlers.set(type, handler);
		if (options.userFacing) this.userFacingTypes.add(type);
	}

	require(type: string): TaskHandler {
		const normalized = normalizeTaskType(type);
		const handler = this.handlers.get(normalized);
		if (!handler) throw new Error(`Unknown task type: ${normalized}`);
		return handler;
	}

	requireUserFacing(type: string): TaskHandler {
		const normalized = normalizeTaskType(type);
		if (!this.userFacingTypes.has(normalized)) {
			throw new Error(`Task type is not approved for renderer start: ${normalized}`);
		}
		return this.require(normalized);
	}

	has(type: string): boolean {
		return this.handlers.has(normalizeTaskType(type));
	}

	isUserFacing(type: string): boolean {
		return this.userFacingTypes.has(normalizeTaskType(type));
	}

	listTypes(): string[] {
		return [...this.handlers.keys()];
	}
}
