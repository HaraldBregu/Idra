import { clone } from './cron_clone';
import { writeState } from './cron_write_state';
import type { CronRuntime } from './cron_types';

export function setRuntime(providerId: string, modelId: string): CronRuntime {
	const runtime: CronRuntime = { providerId: providerId.trim(), modelId: modelId.trim() };
	return writeState((state) => {
		state.providerId = runtime.providerId;
		state.modelId = runtime.modelId;
		return clone(runtime);
	});
}
