import { clone } from './tasks_clone';
import { writeState } from './tasks_write_state';
import type { TaskRuntime } from './tasks_types';

export function setRuntime(providerId: string, modelId: string): TaskRuntime {
	const runtime: TaskRuntime = { providerId: providerId.trim(), modelId: modelId.trim() };
	return writeState((state) => {
		state.providerId = runtime.providerId;
		state.modelId = runtime.modelId;
		return clone(runtime);
	});
}
