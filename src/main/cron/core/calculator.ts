import type { CronSchedule } from '../types';

export abstract class NextRunCalculator {
	abstract getNextRun(schedule: CronSchedule, from?: Date): Date | null;
}
