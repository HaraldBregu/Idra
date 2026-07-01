import { clone } from './cron-clone';
import { writeState } from './cron-write-state';
import type { CronSchedule } from './cron-types';

export function create(schedule: CronSchedule): CronSchedule {
	return writeState((state) => {
		state.schedules.push(clone(schedule));
		return clone(schedule);
	});
}
