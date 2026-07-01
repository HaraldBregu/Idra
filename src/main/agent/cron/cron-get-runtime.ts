import { clone } from './cron-clone';
import { readState } from './cron-read-state';
import type { CronRuntime } from './cron-types';

export function getRuntime(): CronRuntime | undefined {
	const runtime = readState().runtime;
	return runtime ? clone(runtime) : undefined;
}
