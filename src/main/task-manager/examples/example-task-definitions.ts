import type { TaskDefinition, TaskExecutionContext, TaskExecutionResult, TaskSchema } from '../core/task.types';
import { DEFAULT_RETRY_POLICY } from '../core/task.types';

const objectSchema = (properties: Record<string, TaskSchema> = {}, required: string[] = []): TaskSchema => ({
	type: 'object',
	properties,
	required,
	additionalProperties: true,
});

const okOutput: TaskSchema = objectSchema({ ok: { type: 'boolean' }, message: { type: 'string' } }, ['ok']);

async function checkpoint(context: TaskExecutionContext, message: string, percentage: number): Promise<void> {
	if (context.signal.aborted) throw context.signal.reason;
	await context.updateProgress({ message, percentage });
	await context.log({ level: 'info', message, metadata: {} });
}

function simpleDefinition(taskType: string, displayName: string): TaskDefinition<Record<string, unknown>, { ok: boolean; message: string }> {
	return {
		taskType,
		displayName,
		description: `${displayName} task`,
		inputSchema: objectSchema(),
		outputSchema: okOutput,
		defaultPriority: 'normal',
		defaultTimeoutMs: 30_000,
		defaultRetryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
		requiredPermissions: [],
		supportsCancellation: true,
		supportsPause: false,
		supportsResume: false,
		supportsProgress: true,
		supportsRecovery: true,
		executor: {
			async execute(input, context): Promise<TaskExecutionResult<{ ok: boolean; message: string }>> {
				await checkpoint(context, `${displayName} started`, 10);
				await checkpoint(context, `${displayName} finished`, 100);
				return { status: 'success', output: { ok: true, message: `${displayName} completed ${Object.keys(input).length} input fields` } };
			},
		},
	};
}

export function createExampleTaskDefinitions(): TaskDefinition[] {
	return [
		simpleDefinition('ai.agent.run', 'Agent Run'),
		simpleDefinition('skill.execute', 'Skill Execution'),
		simpleDefinition('tool.execute', 'Tool Execution'),
		simpleDefinition('connector.sync', 'Connector Sync'),
		{
			...simpleDefinition('file.index', 'File Indexing'),
			requiredPermissions: ['accessFileSystem'],
			defaultPriority: 'low',
		},
		{
			...simpleDefinition('email.draft', 'Email Draft'),
			requiredPermissions: ['writePrivateData'],
			requiresConfirmation: true,
		},
		simpleDefinition('calendar.sync', 'Calendar Sync'),
		simpleDefinition('memory.compact', 'Memory Compaction'),
		simpleDefinition('cron.maintenance', 'Cron Maintenance'),
		simpleDefinition('api.import', 'API Import'),
	];
}
