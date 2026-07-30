import { clone } from './cron_clone';
import { writeState } from './cron_write_state';
import type { CronSchedule } from './cron_types';

export function create(schedule: CronSchedule): CronSchedule {
	return writeState((state) => {
		state.schedules.push(clone(schedule));
		return clone(schedule);
	});
}
