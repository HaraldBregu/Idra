import { NodeCronJobRegistry } from '../../../../src/main/cron/adapters/registry';
import type { CronLogger } from '../../../../src/main/cron/core/logger';

function createLogger(): CronLogger {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
}

describe('NodeCronJobRegistry', () => {
	it('lists and deletes registered jobs when automatic execution is disabled', () => {
		const registry = new NodeCronJobRegistry(createLogger(), false);

		const task = registry.schedule(
			'daily-summary',
			'0 9 * * *',
			{ type: 'agent', prompt: 'Summarize today' },
			jest.fn(),
			{
				name: 'Daily summary',
				description: 'Morning assistant summary',
				timezone: 'Europe/Rome',
			}
		);

		expect(task.enabled).toBe(false);
		expect(task.status).toBe('disabled');
		expect(registry.listJobs()).toEqual([
			expect.objectContaining({
				id: 'daily-summary',
				name: 'Daily summary',
				description: 'Morning assistant summary',
				expression: '0 9 * * *',
				timezone: 'Europe/Rome',
				enabled: false,
				status: 'disabled',
				target: 'job',
			}),
		]);

		registry.unschedule('daily-summary');

		expect(registry.listJobs()).toEqual([]);
	});
});
