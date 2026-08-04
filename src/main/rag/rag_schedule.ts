import cron, { type ScheduledTask } from 'node-cron';
import { indexRag } from './rag_index';
import { getRagConfiguration } from './rag_store';

export interface RagScheduleLogger {
	info(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}

let task: ScheduledTask | undefined;
let scheduleLogger: RagScheduleLogger | undefined;

export function startRagSchedule(logger: RagScheduleLogger): void {
	scheduleLogger = logger;
	schedule();
}

export function stopRagSchedule(): void {
	task?.destroy();
	task = undefined;
	scheduleLogger = undefined;
}

export function rescheduleRagIndexing(): void {
	if (scheduleLogger) schedule();
}

function schedule(): void {
	task?.destroy();
	task = undefined;
	const logger = scheduleLogger;
	const configuration = getRagConfiguration();
	if (!logger || !configuration.scheduleEnabled || configuration.folders.length === 0) return;
	if (!cron.validate(configuration.cronExpression)) {
		logger.error('RAG', `Invalid indexing schedule: ${configuration.cronExpression}`);
		return;
	}
	logger.info('RAG', `Indexing ${configuration.folders.length} folder(s) on ${configuration.cronExpression}`);
	task = cron.schedule(
		configuration.cronExpression,
		async () => {
			try {
				await indexRag(configuration.folders);
				logger.info('RAG', 'Scheduled indexing completed.');
			} catch (error) {
				logger.error('RAG', 'Scheduled indexing failed.', error);
			}
		},
		{ noOverlap: true }
	);
}
