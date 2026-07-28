import type { ScheduledTask } from 'node-cron';
import type { WikiRunResult } from '../../shared/wiki_types';

export const wikiRuntime: {
	task?: ScheduledTask;
	run?: Promise<WikiRunResult>;
	lastRun?: WikiRunResult;
} = {};
