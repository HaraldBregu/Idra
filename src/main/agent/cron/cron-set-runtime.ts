import { clone } from './cron-clone';
import { writeState } from './cron-write-state';
import type { CronRuntime } from './cron-types';

export function setRuntime(providerId: string, modelId: string): CronRuntime {
	const runtime: CronRuntime = { providerId: providerId.trim(), modelId: modelId.trim() };
	return writeState((state) => {
		state.runtime = clone(runtime);
		return clone(runtime);
	});
}
