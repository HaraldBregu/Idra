import { clone } from './tasks_clone';
import { readState } from './tasks_read_state';
import type { TaskRuntime } from './tasks_types';

export function getRuntime(): TaskRuntime | undefined {
	const { providerId, modelId } = readState();
	return providerId && modelId ? clone({ providerId, modelId }) : undefined;
}
