import { EventBus } from '../../../../src/main/core';
import { MONITORED_APP_EVENT_TYPES, MonitorService } from '../../../../src/main/monitor';
import type { TaskRecord } from '../../../../src/shared/tasks';

function createNowFactory(): () => string {
	let tick = 0;
	return () => new Date(1_778_880_000_000 + tick++).toISOString();
}

function createIdFactory(): () => string {
	let next = 1;
	return () => `monitor-${next++}`;
}

describe('MonitorService', () => {
	it('records typed main-process events with category and severity', () => {
		const eventBus = new EventBus();
		const service = new MonitorService({
			eventBus,
			now: createNowFactory(),
			idFactory: createIdFactory(),
		});

		service.start();
		eventBus.emit('window:created', { windowId: 7, type: 'main' });
		eventBus.emit('error:critical', {
			context: 'test',
			error: new Error('boom'),
		});

		expect(service.snapshot().records).toMatchObject([
			{
				id: 'monitor-1',
				source: 'event-bus',
				eventType: 'window:created',
				category: 'window',
				severity: 'info',
				payload: { windowId: 7, type: 'main' },
			},
			{
				id: 'monitor-2',
				eventType: 'error:critical',
				category: 'error',
				severity: 'error',
				payload: {
					context: 'test',
					error: {
						name: 'Error',
						message: 'boom',
					},
				},
			},
		]);
	});

	it('redacts secret-looking payload fields before storing records', () => {
		const eventBus = new EventBus();
		const service = new MonitorService({
			eventBus,
			now: createNowFactory(),
			idFactory: createIdFactory(),
		});
		const task: TaskRecord = {
			id: 'task-1',
			type: 'agent.run',
			title: 'Agent task',
			status: 'failed',
			createdAt: '2026-05-24T00:00:00.000Z',
			metadata: {
				apiKey: 'secret-key',
				visible: 'ok',
				nested: { token: 'secret-token' },
			},
			error: { code: 'TaskError', message: 'Authorization: Bearer abc123' },
		};

		service.start();
		eventBus.emit('task:failed', { type: 'task:failed', task });

		expect(service.list()[0]?.payload).toMatchObject({
			task: {
				metadata: {
					apiKey: '[redacted]',
					visible: 'ok',
					nested: { token: '[redacted]' },
				},
				error: {
					message: 'Authorization: Bearer [redacted]',
				},
			},
		});
	});

	it('keeps bounded history and supports filters', () => {
		const eventBus = new EventBus();
		const service = new MonitorService({
			eventBus,
			maxRecords: 2,
			now: createNowFactory(),
			idFactory: createIdFactory(),
		});

		service.start();
		eventBus.emit('window:created', { windowId: 1, type: 'main' });
		eventBus.emit('task:cancelled', {
			type: 'task:cancelled',
			task: {
				id: 'task-1',
				type: 'agent.run',
				title: 'Cancelled',
				status: 'cancelled',
				createdAt: '2026-05-24T00:00:00.000Z',
				metadata: {},
			},
		});
		eventBus.emit('task:failed', {
			type: 'task:failed',
			task: {
				id: 'task-2',
				type: 'agent.run',
				title: 'Failed',
				status: 'failed',
				createdAt: '2026-05-24T00:00:00.000Z',
				metadata: {},
			},
		});

		expect(service.list().map((record) => record.eventType)).toEqual([
			'task:cancelled',
			'task:failed',
		]);
		expect(service.list({ severity: 'error' }).map((record) => record.eventType)).toEqual([
			'task:failed',
		]);
		expect(service.list({ category: 'task', limit: 1 }).map((record) => record.id)).toEqual([
			'monitor-3',
		]);
	});

	it('unsubscribes from the event bus on destroy', () => {
		const eventBus = new EventBus();
		const service = new MonitorService({
			eventBus,
			now: createNowFactory(),
			idFactory: createIdFactory(),
		});

		service.start();
		eventBus.emit('window:created', { windowId: 1, type: 'main' });
		service.destroy();
		eventBus.emit('window:closed', { windowId: 1 });

		expect(service.list().map((record) => record.eventType)).toEqual(['window:created']);
	});

	it('notifies listeners with sanitized cloned records', () => {
		const eventBus = new EventBus();
		const service = new MonitorService({
			eventBus,
			now: createNowFactory(),
			idFactory: createIdFactory(),
		});
		const observed: unknown[] = [];

		service.start();
		const unsubscribe = service.onRecord((record) => {
			observed.push(JSON.parse(JSON.stringify(record)));
			(record.payload as { token?: unknown }).token = 'mutated';
		});
		eventBus.emit('channel:route', {
			channel: 'telegram',
			to: 'chat',
			token: 'secret-token',
		});
		unsubscribe();
		eventBus.emit('window:created', { windowId: 2, type: 'main' });

		expect(observed).toMatchObject([
			{
				id: 'monitor-1',
				eventType: 'channel:route',
				payload: {
					channel: 'telegram',
					to: 'chat',
					token: '[redacted]',
				},
			},
		]);
		expect(service.get('monitor-1')?.payload).toMatchObject({ token: '[redacted]' });
	});

	it('tracks every typed app event currently exposed by EventBus', () => {
		expect(MONITORED_APP_EVENT_TYPES).toEqual([
			'service:initialized',
			'service:destroyed',
			'error:critical',
			'window:created',
			'window:closed',
			'task:created',
			'task:started',
			'task:updated',
			'task:succeeded',
			'task:failed',
			'task:cancelled',
			'subagent:created',
			'subagent:started',
			'subagent:completed',
			'tray:set-enabled',
			'channel:status',
			'channel:route',
			'heartbeat:event',
		]);
	});
});
