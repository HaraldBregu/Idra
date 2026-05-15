import type { TaskDefinition, TaskType } from '../core/task.types';
import { TaskDefinitionNotFoundError, TaskValidationError } from '../core/task.errors';

export class TaskDefinitionRegistry {
	private readonly definitions = new Map<TaskType, TaskDefinition>();

	registerTaskDefinition(definition: TaskDefinition): void {
		if (!definition.taskType.trim()) throw new TaskValidationError('Task definition requires a taskType.');
		if (this.definitions.has(definition.taskType)) {
			throw new TaskValidationError(`Task definition already registered: ${definition.taskType}`);
		}
		this.definitions.set(definition.taskType, definition);
	}

	unregisterTaskDefinition(taskType: TaskType): void {
		this.definitions.delete(taskType);
	}

	getTaskDefinition(taskType: TaskType): TaskDefinition {
		const definition = this.definitions.get(taskType);
		if (!definition) throw new TaskDefinitionNotFoundError(taskType);
		return definition;
	}

	listTaskDefinitions(): TaskDefinition[] {
		return [...this.definitions.values()];
	}

	hasTaskDefinition(taskType: TaskType): boolean {
		return this.definitions.has(taskType);
	}
}
