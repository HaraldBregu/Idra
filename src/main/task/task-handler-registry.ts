import type { TaskHandler } from './task-handler';

/**
 * Registry for task handlers.
 * Manages registration and lookup of task handlers by type.
 * Mirrors the simple type-to-handler registry pattern used elsewhere.
 */
export class TaskHandlerRegistry {
	private handlers = new Map<string, TaskHandler>();

	/**
	 * Register a task handler.
	 * @param handler - Task handler to register
	 * @throws Error if handler type is already registered
	 */
	register(handler: TaskHandler): void {
		if (this.handlers.has(handler.type)) {
			throw new Error(`Task handler already registered: ${handler.type}`);
		}
		this.handlers.set(handler.type, handler);
	}

	/**
	 * Get a task handler by type.
	 * @param type - Task type identifier
	 * @returns Task handler instance
	 * @throws Error if handler not found
	 */
	get(type: string): TaskHandler {
		const handler = this.handlers.get(type);
		if (!handler) {
			throw new Error(`Unknown task type: ${type}`);
		}
		return handler;
	}

	/**
	 * Check if a handler is registered.
	 * @param type - Task type identifier
	 * @returns True if handler is registered
	 */
	has(type: string): boolean {
		return this.handlers.has(type);
	}

	/**
	 * List all registered task types.
	 * @returns Array of task type identifiers
	 */
	listTypes(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Clear all registered handlers.
	 * Useful for testing.
	 */
	clear(): void {
		this.handlers.clear();
	}
}
