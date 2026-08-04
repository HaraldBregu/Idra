import { clone } from './cron_clone';
import { readState } from './cron_read_state';
import type { CronRuntime } from './cron_types';

export function getRuntime(): CronRuntime | undefined {
	const { providerId, modelId } = readState();
	return providerId && modelId ? clone({ providerId, modelId }) : undefined;
}
