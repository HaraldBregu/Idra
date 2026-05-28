import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../app/service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { MonitorChannels } from '../../shared/ipc-channels';
import type { MonitorEventFilter, MonitorEventSeverity, MonitorEventSource } from '../../shared/monitor';

const MONITOR_EVENT_SOURCES: readonly MonitorEventSource[] = ['event-bus'];
const MONITOR_EVENT_SEVERITIES: readonly MonitorEventSeverity[] = ['info', 'warn', 'error'];

function isMonitorEventSource(value: unknown): value is MonitorEventSource {
	return typeof value === 'string' && MONITOR_EVENT_SOURCES.includes(value as MonitorEventSource);
}

function isMonitorEventSeverity(value: unknown): value is MonitorEventSeverity {
	return (
		typeof value === 'string' &&
		MONITOR_EVENT_SEVERITIES.includes(value as MonitorEventSeverity)
	);
}

function parseStringField(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'string') throw new Error(`${field} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function parseMonitorFilter(value: unknown): MonitorEventFilter {
	if (value === undefined || value === null) return {};
	if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Monitor filter must be an object.');

	const input = value as Record<string, unknown>;
	const filter: MonitorEventFilter = {};
	const eventType = parseStringField(input.eventType, 'eventType');
	const category = parseStringField(input.category, 'category');

	if (eventType) filter.eventType = eventType;
	if (category) filter.category = category;
	if (input.source !== undefined) {
		if (!isMonitorEventSource(input.source)) throw new Error('source must be a valid monitor source.');
		filter.source = input.source;
	}
	if (input.severity !== undefined) {
		if (!isMonitorEventSeverity(input.severity)) {
			throw new Error('severity must be a valid monitor severity.');
		}
		filter.severity = input.severity;
	}
	if (input.limit !== undefined) {
		const limit = input.limit;
		if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit <= 0) {
			throw new Error('limit must be a positive integer.');
		}
		filter.limit = limit;
	}

	return filter;
}

export class MonitorIpc implements IpcModule {
	readonly name = 'monitor';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const monitor = container.get('monitor');

		ipcMain.handle(
			MonitorChannels.snapshot,
			wrapSimpleHandler((filter?: unknown) => monitor.snapshot(parseMonitorFilter(filter)), MonitorChannels.snapshot)
		);

		ipcMain.handle(
			MonitorChannels.list,
			wrapSimpleHandler((filter?: unknown) => monitor.list(parseMonitorFilter(filter)), MonitorChannels.list)
		);

		ipcMain.handle(
			MonitorChannels.get,
			wrapSimpleHandler((id: string) => {
				if (typeof id !== 'string' || !id.trim()) throw new Error('Monitor record id is required.');
				return monitor.get(id);
			}, MonitorChannels.get)
		);

		monitor.onRecord((record) => {
			eventBus.broadcast(MonitorChannels.event, record);
		});
	}
}
