import type { CronSchedule } from '../types';

/**
 * Contract for computing the next fire time of a schedule. Implementations
 * return the next run as a Date, or null when the schedule will never run again.
 */
export abstract class NextRunCalculator {
	abstract getNextRun(schedule: CronSchedule, from?: Date): Date | null;
}
