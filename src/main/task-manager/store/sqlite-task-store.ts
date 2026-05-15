import type {
	Task,
	TaskAttempt,
	TaskEvent,
	TaskId,
	TaskListFilter,
	TaskStore,
	Workflow,
	WorkflowId,
	WorkflowListFilter,
} from '../core/task.types';
import { TaskStoreError } from '../core/task.errors';

/**
 * SQLite adapter design for Electron persistence.
 *
 * The project does not currently include a SQLite driver, so this class is a
 * typed adapter skeleton rather than a dependency-adding implementation. The
 * intended schema is:
 * - tasks(id primary key, type, status, priority, source, user_id, workflow_id, json)
 * - task_events(id primary key, task_id, type, created_at, json)
 * - task_attempts(id primary key, task_id, attempt_number, status, json)
 * - workflows(id primary key, status, created_at, json)
 *
 * The renderer must never instantiate this store directly; it belongs in the
 * Electron main process and should be wrapped by TaskManager IPC.
 */
export class SQLiteTaskStore implements TaskStore {
	constructor(readonly databasePath: string) {}

	async createTask(_task: Task): Promise<void> { throw this.notConfigured(); }
	async updateTask(_taskId: TaskId, _patch: Partial<Task>): Promise<void> { throw this.notConfigured(); }
	async getTask(_taskId: TaskId): Promise<Task> { throw this.notConfigured(); }
	async listTasks(_filter?: TaskListFilter): Promise<Task[]> { throw this.notConfigured(); }
	async deleteTask(_taskId: TaskId): Promise<void> { throw this.notConfigured(); }
	async appendEvent(_event: TaskEvent): Promise<void> { throw this.notConfigured(); }
	async getEvents(_taskId: TaskId): Promise<TaskEvent[]> { throw this.notConfigured(); }
	async createAttempt(_attempt: TaskAttempt): Promise<void> { throw this.notConfigured(); }
	async updateAttempt(_attemptId: string, _patch: Partial<TaskAttempt>): Promise<void> { throw this.notConfigured(); }
	async acquireLock(_taskId: TaskId, _workerId: string, _ttlMs: number): Promise<boolean> { throw this.notConfigured(); }
	async releaseLock(_taskId: TaskId, _workerId: string): Promise<void> { throw this.notConfigured(); }
	async listRecoverableTasks(): Promise<Task[]> { throw this.notConfigured(); }
	async createWorkflow(_workflow: Workflow): Promise<void> { throw this.notConfigured(); }
	async updateWorkflow(_workflowId: WorkflowId, _patch: Partial<Workflow>): Promise<void> { throw this.notConfigured(); }
	async getWorkflow(_workflowId: WorkflowId): Promise<Workflow> { throw this.notConfigured(); }
	async listWorkflows(_filter?: WorkflowListFilter): Promise<Workflow[]> { throw this.notConfigured(); }

	private notConfigured(): TaskStoreError {
		return new TaskStoreError(
			`SQLiteTaskStore requires a concrete SQLite driver adapter for ${this.databasePath}.`
		);
	}
}
