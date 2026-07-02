import { clone } from './cron_clone';
import { writeState } from './cron_write_state';
import type { CronSchedule } from './cron_types';

export function remove(scheduleId: string): CronSchedule {
	return writeState((state) => {
		const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
		if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
		const [removed] = state.schedules.splice(index, 1);
		return clone(removed!);
	});
}
