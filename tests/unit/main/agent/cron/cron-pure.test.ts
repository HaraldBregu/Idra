import { clone } from '../../../../../src/main/app/cron/cron_clone';
import { isActiveSchedule } from '../../../../../src/main/app/cron/cron_is_active_schedule';
import { buildTask } from '../../../../../src/main/app/cron/cron_build_task';
import type { CronSchedule } from '../../../../../src/main/app/cron/cron_types';

function schedule(overrides: Partial<CronSchedule> = {}): CronSchedule {
	return {
		id: 's1',
		name: 'Nightly',
		description: 'runs nightly',
		cronExpression: '0 0 * * *',
		enabled: true,
		action: { type: 'agent', prompt: 'do it' },
		createdAt: 'now',
		updatedAt: 'now',
		...overrides,
	} as CronSchedule;
}

describe('clone', () => {
	it('deep-copies a value', () => {
		const original = { a: { b: 1 }, list: [1, 2] };
		const copy = clone(original);
		expect(copy).toEqual(original);
		expect(copy).not.toBe(original);
		expect(copy.a).not.toBe(original.a);
	});
});

describe('isActiveSchedule', () => {
	it('reflects the enabled flag', () => {
		expect(isActiveSchedule(schedule({ enabled: true }))).toBe(true);
		expect(isActiveSchedule(schedule({ enabled: false }))).toBe(false);
	});
});

describe('buildTask', () => {
	it('derives a task from the schedule', () => {
		const task = buildTask(schedule({ name: 'Nightly', description: 'runs nightly' }));
		expect(task.title).toBe('Nightly');
		expect(task.description).toBe('runs nightly');
		expect(task.id).toMatch(/[0-9a-f-]{36}/);
		expect(task.createdAt).toBe(task.updatedAt);
	});
});
