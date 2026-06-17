import type { CronSchedule, CronSchedulePermissionLevel } from '../../shared/app/cron';

export interface CronLogger {
	debug?(scope: string, message: string, metadata?: unknown): void;
	info(scope: string, message: string, metadata?: unknown): void;
	warn(scope: string, message: string, metadata?: unknown): void;
	error(scope: string, message: string, metadata?: unknown): void;
}

/**
 * Caller context for a schedule operation. Retained so the IPC layer can keep
 * passing a UI actor, but the simplified service does not enforce permissions.
 */
export interface CronActorContext {
	source?: string;
	userId?: string;
	sessionId?: string;
	timezone?: string;
	permissions?: CronSchedulePermissionLevel[];
}

export type CronServiceActor = CronActorContext;

export interface CronServiceOptions {
	enabled?: boolean;
}

/** Shape persisted to the cron electron-store settings file. */
export interface PersistedCronState {
	schemaVersion: number;
	enabled?: boolean;
	schedules: CronSchedule[];
}
