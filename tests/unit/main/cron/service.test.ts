/**
 * Unit tests for CronService (src/main/cron/service.ts).
 *
 * node-cron is mocked so timers never start. Cron tasks are persisted via
 * an in-memory cron persistence stub, exercising the real schedule/unschedule/
 * restore logic without touching electron-store or the filesystem.
 */

jest.mock('node-cron', () => {
	const stop = jest.fn();
	const getNextRun = jest.fn(() => null as Date | null);
	const schedule = jest.fn(() => ({ stop, getNextRun }));
	const validate = jest.fn((expr: string) => expr !== 'invalid');
	return {
		__esModule: true,
		default: { schedule, validate },
		_stop: stop,
		_schedule: schedule,
		_validate: validate,
		_getNextRun: getNextRun,
	};
});

import cron from 'node-cron';
import { CronService, type CronServiceStore } from '../../../../src/main/cron';
import { emptyCronStoreState } from '../../../../src/main/cron/store/cron-store-migrations';
import { emptyFridayCronStoreState } from '../../../../src/main/cron/workflow/store';
import type { LoggerService } from '../../../../src/main/logger';
import type { CronTask, CronTaskMessageData } from '../../../../src/shared/cron';

// ---------------------------------------------------------------------------
// Typed accessors for the mocked node-cron internals.
// ---------------------------------------------------------------------------

const cronMock = cron as unknown as {
	schedule: jest.Mock;
	validate: jest.Mock;
};
const stopMock = (jest.requireMock('node-cron') as { _stop: jest.Mock })._stop;

// ---------------------------------------------------------------------------
// Test helpers — in-memory store + silent logger + data factory.
// ---------------------------------------------------------------------------

function createStore(initial: CronTask[] = []): CronServiceStore {
	let tasks: CronTask[] = [...initial];
	return {
		getCronTasks: jest.fn(() => tasks),
		setCronTasks: jest.fn((next: CronTask[]) => {
			tasks = next;
		}),
		getCronSchedulerState: jest.fn(() => emptyCronStoreState()),
		setCronSchedulerState: jest.fn(),
		getFridayCronState: jest.fn(() => emptyFridayCronStoreState()),
		setFridayCronState: jest.fn(),
	};
}

function createLogger(): LoggerService {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} as unknown as LoggerService;
}

function msg(message: string): CronTaskMessageData {
	return { type: 'message', message };
}

function messageOf(task: CronTask): string | undefined {
	return task.data.type === 'message' ? (task.data as CronTaskMessageData).message : undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CronService', () => {
	beforeEach(() => {
		cronMock.schedule.mockClear();
		cronMock.validate.mockClear();
		cronMock.validate.mockImplementation((expr: string) => expr !== 'invalid');
		stopMock.mockClear();
	});

	// -------------------------------------------------------------------------
	// schedule()
	// -------------------------------------------------------------------------

	describe('schedule()', () => {
		it('schedules a job and persists it (with data) to the store', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });

			service.schedule('job-1', '* * * * *', msg('Daily backup'), () => undefined, {
				timezone: 'UTC',
			});

			expect(cronMock.schedule).toHaveBeenCalledTimes(1);
			expect(service.has('job-1')).toBe(true);
			expect(store.setCronTasks).toHaveBeenCalledTimes(1);
			const persisted = (store.setCronTasks as jest.Mock).mock.calls[0][0] as CronTask[];
			expect(persisted).toHaveLength(1);
			expect(persisted[0]).toMatchObject({
				id: 'job-1',
				expression: '* * * * *',
				data: { type: 'message', message: 'Daily backup' },
				timezone: 'UTC',
			});
			expect(typeof persisted[0].createdAt).toBe('string');
		});

		it('returns the persisted CronTask record including the data payload', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });

			const result = service.schedule(
				'job-1',
				'* * * * *',
				msg('Hello world'),
				() => undefined
			);

			expect(result).toMatchObject({
				id: 'job-1',
				expression: '* * * * *',
				data: { type: 'message', message: 'Hello world' },
			});
		});

		it('preserves arbitrary caller-defined data types via the T generic', () => {
			interface AgentLike {
				readonly type: 'agent';
				readonly prompt: string;
			}
			const store = createStore();
			const service = new CronService(createLogger(), { store });

			const result = service.schedule<AgentLike>(
				'agent-job',
				'* * * * *',
				{ type: 'agent', prompt: 'summarize inbox' },
				() => undefined
			);

			expect(result.data.type).toBe('agent');
			expect(result.data.prompt).toBe('summarize inbox');
		});

		it('throws and does not persist when the id is already registered', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });
			service.schedule('dup', '* * * * *', msg('first'), () => undefined);
			(store.setCronTasks as jest.Mock).mockClear();

			expect(() =>
				service.schedule('dup', '* * * * *', msg('second'), () => undefined)
			).toThrow(/already registered/);
			expect(store.setCronTasks).not.toHaveBeenCalled();
		});

		it('throws and does not persist when the expression is invalid', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });

			expect(() =>
				service.schedule('bad', 'invalid', msg('msg'), () => undefined)
			).toThrow(/Invalid cron expression/);
			expect(cronMock.schedule).not.toHaveBeenCalled();
			expect(store.setCronTasks).not.toHaveBeenCalled();
		});

		it('runs the handler immediately when runOnStart is true', async () => {
			const store = createStore();
			const handler = jest.fn();
			const service = new CronService(createLogger(), { store });

			service.schedule('eager', '* * * * *', msg('eager run'), handler, { runOnStart: true });
			await Promise.resolve();

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('persists multiple jobs as a list (no overwrite) and keeps each payload', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });

			service.schedule('a', '* * * * *', msg('msg-a'), () => undefined);
			service.schedule('b', '*/5 * * * *', msg('msg-b'), () => undefined);

			const persisted = (store.setCronTasks as jest.Mock).mock.calls.at(-1)?.[0] as CronTask[];
			expect(persisted.map((t) => ({ id: t.id, message: messageOf(t) }))).toEqual([
				{ id: 'a', message: 'msg-a' },
				{ id: 'b', message: 'msg-b' },
			]);
		});

		it('logs and swallows errors thrown by the cron handler', async () => {
			const store = createStore();
			const logger = createLogger();
			const service = new CronService(logger, { store });
			const handler = jest.fn(() => {
				throw new Error('boom');
			});

			service.schedule('fail', '* * * * *', msg('will fail'), handler);
			// Invoke the wrapper passed to cron.schedule directly.
			const wrapper = cronMock.schedule.mock.calls[0][1] as () => Promise<void>;
			await wrapper();

			expect(logger.error).toHaveBeenCalledWith(
				'CronService',
				'Job "fail" failed',
				expect.any(Error)
			);
		});
	});

	// -------------------------------------------------------------------------
	// unschedule()
	// -------------------------------------------------------------------------

	describe('unschedule()', () => {
		it('stops the task and removes it from the store', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });
			service.schedule('job-1', '* * * * *', msg('msg'), () => undefined);

			service.unschedule('job-1');

			expect(stopMock).toHaveBeenCalledTimes(1);
			expect(service.has('job-1')).toBe(false);
			const lastWrite = (store.setCronTasks as jest.Mock).mock.calls.at(-1)?.[0] as CronTask[];
			expect(lastWrite).toEqual([]);
		});

		it('only removes the targeted id, leaving other persisted tasks intact', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });
			service.schedule('keep', '* * * * *', msg('keep me'), () => undefined);
			service.schedule('drop', '*/2 * * * *', msg('drop me'), () => undefined);

			service.unschedule('drop');

			const lastWrite = (store.setCronTasks as jest.Mock).mock.calls.at(-1)?.[0] as CronTask[];
			expect(lastWrite.map((t) => t.id)).toEqual(['keep']);
			expect(messageOf(lastWrite[0])).toBe('keep me');
		});

		it('is a no-op when the id is unknown', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });

			service.unschedule('ghost');

			expect(stopMock).not.toHaveBeenCalled();
			expect(store.setCronTasks).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// restore()
	// -------------------------------------------------------------------------

	describe('restore()', () => {
		it('reschedules every persisted task and dispatches via the supplied handler', async () => {
			const tasks: CronTask[] = [
				{
					id: 'a',
					expression: '* * * * *',
					data: msg('task a'),
					createdAt: '2026-01-01T00:00:00Z',
				},
				{
					id: 'b',
					expression: '*/5 * * * *',
					data: msg('task b'),
					timezone: 'Europe/Rome',
					createdAt: '2026-01-02T00:00:00Z',
				},
			];
			const store = createStore(tasks);
			const dispatcher = jest.fn();
			const service = new CronService(createLogger(), { store });

			service.restore(dispatcher);

			expect(cronMock.schedule).toHaveBeenCalledTimes(2);
			expect(service.has('a')).toBe(true);
			expect(service.has('b')).toBe(true);
			const secondCallOpts = cronMock.schedule.mock.calls[1][2] as { timezone?: string };
			expect(secondCallOpts.timezone).toBe('Europe/Rome');

			const wrapperA = cronMock.schedule.mock.calls[0][1] as () => Promise<void>;
			await wrapperA();
			expect(dispatcher).toHaveBeenCalledWith(tasks[0]);
			expect(messageOf(dispatcher.mock.calls[0][0] as CronTask)).toBe('task a');
		});

		it('migrates legacy persisted tasks with a top-level `message` field', async () => {
			const legacy = [
				{
					id: 'legacy',
					expression: '* * * * *',
					message: 'old shape',
					createdAt: '2026-01-01T00:00:00Z',
				},
			] as unknown as CronTask[];
			const store = createStore(legacy);
			const dispatcher = jest.fn();
			const service = new CronService(createLogger(), { store });

			service.restore(dispatcher);

			const wrapper = cronMock.schedule.mock.calls[0][1] as () => Promise<void>;
			await wrapper();
			const dispatched = dispatcher.mock.calls[0][0] as CronTask;
			expect(dispatched.data).toEqual({ type: 'message', message: 'old shape' });
		});

		it('does not duplicate jobs that are already in memory', () => {
			const tasks: CronTask[] = [
				{
					id: 'a',
					expression: '* * * * *',
					data: msg('task a'),
					createdAt: '2026-01-01T00:00:00Z',
				},
			];
			const store = createStore(tasks);
			const service = new CronService(createLogger(), { store });
			service.schedule('a', '* * * * *', msg('task a (live)'), () => undefined);
			cronMock.schedule.mockClear();

			service.restore(() => undefined);

			expect(cronMock.schedule).not.toHaveBeenCalled();
		});

		it('skips persisted tasks with an invalid expression and logs a warning', () => {
			const tasks: CronTask[] = [
				{
					id: 'good',
					expression: '* * * * *',
					data: msg('good task'),
					createdAt: '2026-01-01T00:00:00Z',
				},
				{
					id: 'bad',
					expression: 'invalid',
					data: msg('bad task'),
					createdAt: '2026-01-02T00:00:00Z',
				},
			];
			const store = createStore(tasks);
			const logger = createLogger();
			const service = new CronService(logger, { store });

			service.restore(() => undefined);

			expect(service.has('good')).toBe(true);
			expect(service.has('bad')).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith(
				'CronService',
				expect.stringContaining('Skipping invalid persisted task "bad"')
			);
		});

		it('returns early and does not call cron.schedule when the store is empty', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });

			service.restore(() => undefined);

			expect(cronMock.schedule).not.toHaveBeenCalled();
		});

		it('logs but does not rethrow when the dispatcher throws', async () => {
			const tasks: CronTask[] = [
				{
					id: 'a',
					expression: '* * * * *',
					data: msg('task a'),
					createdAt: '2026-01-01T00:00:00Z',
				},
			];
			const store = createStore(tasks);
			const logger = createLogger();
			const service = new CronService(logger, { store });

			service.restore(() => {
				throw new Error('dispatcher boom');
			});

			const wrapper = cronMock.schedule.mock.calls[0][1] as () => Promise<void>;
			await expect(wrapper()).resolves.toBeUndefined();
			expect(logger.error).toHaveBeenCalledWith(
				'CronService',
				'Restored job "a" failed',
				expect.any(Error)
			);
		});
	});

	// -------------------------------------------------------------------------
	// listJobs() / has()
	// -------------------------------------------------------------------------

	describe('listJobs() and has()', () => {
		it('listJobs returns id+expression for every active job', () => {
			const service = new CronService(createLogger(), { store: createStore() });
			service.schedule('a', '* * * * *', msg('msg-a'), () => undefined);
			service.schedule('b', '*/5 * * * *', msg('msg-b'), () => undefined);

			expect(service.listJobs()).toEqual([
				{ id: 'a', expression: '* * * * *' },
				{ id: 'b', expression: '*/5 * * * *' },
			]);
		});

		it('has returns true only for currently scheduled ids', () => {
			const service = new CronService(createLogger(), { store: createStore() });
			service.schedule('present', '* * * * *', msg('present msg'), () => undefined);

			expect(service.has('present')).toBe(true);
			expect(service.has('missing')).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// destroy()
	// -------------------------------------------------------------------------

	describe('destroy()', () => {
		it('stops every active job and clears the in-memory map', () => {
			const service = new CronService(createLogger(), { store: createStore() });
			service.schedule('a', '* * * * *', msg('msg-a'), () => undefined);
			service.schedule('b', '*/5 * * * *', msg('msg-b'), () => undefined);

			service.destroy();

			expect(stopMock).toHaveBeenCalledTimes(2);
			expect(service.listJobs()).toEqual([]);
		});

		it('does NOT clear persisted tasks (they survive across restarts)', () => {
			const store = createStore();
			const service = new CronService(createLogger(), { store });
			service.schedule('a', '* * * * *', msg('msg-a'), () => undefined);
			(store.setCronTasks as jest.Mock).mockClear();

			service.destroy();

			expect(store.setCronTasks).not.toHaveBeenCalled();
		});

		it('logs and continues when stopping a job throws', () => {
			const service = new CronService(createLogger(), { store: createStore() });
			service.schedule('a', '* * * * *', msg('msg-a'), () => undefined);
			stopMock.mockImplementationOnce(() => {
				throw new Error('stop boom');
			});

			expect(() => service.destroy()).not.toThrow();
		});
	});
});
