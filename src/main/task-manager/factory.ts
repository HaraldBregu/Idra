import { TaskDefinitionRegistry } from './registry/task-definition-registry';
import { InMemoryTaskStore } from './store/in-memory-task-store';
import { TaskManagerService, type TaskManagerServiceOptions } from './manager/task-manager';
import { createExampleTaskDefinitions } from './examples/example-task-definitions';

export function createDefaultTaskManager(
	options: Partial<Omit<TaskManagerServiceOptions, 'store' | 'registry'>> & {
		store?: TaskManagerServiceOptions['store'];
		registry?: TaskDefinitionRegistry;
	} = {}
): TaskManagerService {
	const registry = options.registry ?? new TaskDefinitionRegistry();
	if (!options.registry) {
		for (const definition of createExampleTaskDefinitions()) registry.registerTaskDefinition(definition);
	}
	return new TaskManagerService({
		...options,
		store: options.store ?? new InMemoryTaskStore(),
		registry,
	});
}
