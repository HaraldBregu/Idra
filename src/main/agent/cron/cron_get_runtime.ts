import { clone } from './cron_clone';
import { readState } from './cron_read_state';
import type { CronRuntime } from './cron_types';

export function getRuntime(): CronRuntime | undefined {
	const runtime = readState().runtime;
	return runtime ? clone(runtime) : undefined;
}
