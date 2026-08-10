import type { ScheduledTask } from 'node-cron';
import type { WikiProgress, WikiRunResult } from '../../shared/wiki_types';

export const wikiRuntime: {
	task?: ScheduledTask;
	run?: Promise<WikiRunResult>;
	lastRun?: WikiRunResult;
	controller?: AbortController;
	progress?: WikiProgress;
	logger?: {
		info(scope: string, message: string, data?: unknown): void;
		error(scope: string, message: string, error?: unknown): void;
	};
} = {};
