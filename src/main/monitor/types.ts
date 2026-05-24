import type { AppEvents } from '../core';

export type MonitorEventSeverity = 'info' | 'warn' | 'error';
export type MonitorEventSource = 'event-bus';

export interface MonitorEventRecord {
	id: string;
	source: MonitorEventSource;
	eventType: keyof AppEvents;
	category: string;
	severity: MonitorEventSeverity;
	observedAt: string;
	eventTimestamp: number;
	payload: unknown;
}

export interface MonitorEventFilter {
	eventType?: keyof AppEvents;
	source?: MonitorEventSource;
	severity?: MonitorEventSeverity;
	category?: string;
	limit?: number;
}

export interface MonitorSnapshot {
	records: MonitorEventRecord[];
	generatedAt: string;
}
