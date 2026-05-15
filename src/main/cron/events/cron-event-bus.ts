import type { CronScheduleEvent, CronScheduleEventType } from '../core/cron.types';

export type CronEventListener = (event: CronScheduleEvent) => void;

export class CronScheduleEventBus {
	private readonly listeners = new Set<CronEventListener>();
	private readonly listenersByType = new Map<CronScheduleEventType, Set<CronEventListener>>();

	emit(event: CronScheduleEvent): void {
		for (const listener of this.listeners) listener(event);
		for (const listener of this.listenersByType.get(event.type) ?? []) listener(event);
	}

	subscribe(listener: CronEventListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	subscribeToType(type: CronScheduleEventType, listener: CronEventListener): () => void {
		const listeners = this.listenersByType.get(type) ?? new Set<CronEventListener>();
		listeners.add(listener);
		this.listenersByType.set(type, listeners);
		return () => listeners.delete(listener);
	}
}
