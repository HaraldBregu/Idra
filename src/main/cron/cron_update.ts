import { clone } from './cron_clone';
import { writeState } from './cron_write_state';
import type { CronSchedule } from './cron_types';

export function update(scheduleId: string, patch: Partial<CronSchedule>): CronSchedule {
	return writeState((state) => {
		const index = state.schedules.findIndex((schedule) => schedule.id === scheduleId);
		if (index === -1) throw new Error(`Cron schedule not found: ${scheduleId}`);
		const current = state.schedules[index]!;
		const next: CronSchedule = {
			...current,
			...clone(patch),
			id: current.id,
		};
		state.schedules[index] = next;
		return clone(next);
	});
}
