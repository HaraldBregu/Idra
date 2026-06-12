export interface CronLogger {
	debug?(scope: string, message: string, metadata?: unknown): void;
	info(scope: string, message: string, metadata?: unknown): void;
	warn(scope: string, message: string, metadata?: unknown): void;
	error(scope: string, message: string, metadata?: unknown): void;
}
