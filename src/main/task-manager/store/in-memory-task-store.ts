import type {
	Task,
	TaskAttempt,
	TaskEvent,
	TaskId,
	TaskListFilter,
	TaskStatus,
	TaskStore,
	Workflow,
	WorkflowId,
	WorkflowListFilter,
} from '../core/task.types';
import { TaskNotFoundError, TaskStoreError } from '../core/task.errors';

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function matchesValue<T extends string>(candidate: T | undefined, expected: T | T[] | undefined): boolean {
	if (!expected) return true;
	if (!candidate) return false;
	return Array.isArray(expected) ? expected.includes(candidate) : candidate === expected;
}

export class InMemoryTaskStore implements TaskStore {
	private readonly tasks = new Map<TaskId, Task>();
	private readonly eventsByTask = new Map<TaskId, TaskEvent[]>();
	private readonly attempts = new Map<string, TaskAttempt>();
	private readonly workflows = new Map<WorkflowId, Workflow>();

	async createTask(task: Task): Promise<void> {
		if (this.tasks.has(task.id)) throw new TaskStoreError(`Task already exists: ${task.id}`);
		this.tasks.set(task.id, clone(task));
	}

	async updateTask(taskId: TaskId, patch: Partial<Task>): Promise<void> {
		const task = await this.getTask(taskId);
		this.tasks.set(taskId, {
			...task,
			...clone(patch),
			id: task.id,
			metadata: {
				...task.metadata,
				...(patch.metadata ?? {}),
			},
			audit: patch.audit ?? task.audit,
		});
	}

	async getTask(taskId: TaskId): Promise<Task> {
		const task = this.tasks.get(taskId);
		if (!task) throw new TaskNotFoundError(taskId);
		return clone(task);
	}

	async listTasks(filter: TaskListFilter = {}): Promise<Task[]> {
		const terminal: TaskStatus[] = ['completed', 'failed', 'cancelled', 'timedOut', 'skipped'];
		const tasks = [...this.tasks.values()]
			.filter((task) => matchesValue(task.status, filter.status))
			.filter((task) => matchesValue(task.source, filter.source))
			.filter((task) => matchesValue(task.type, filter.type))
			.filter((task) => matchesValue(task.visibility, filter.visibility))
			.filter((task) => !filter.userId || task.userId === filter.userId)
			.filter((task) => !filter.sessionId || task.sessionId === filter.sessionId)
			.filter((task) => !filter.workflowId || task.workflowId === filter.workflowId)
			.filter((task) => !filter.parentTaskId || task.parentTaskId === filter.parentTaskId)
			.filter((task) => !filter.tag || task.tags.includes(filter.tag))
			.filter((task) => filter.includeTerminal !== false || !terminal.includes(task.status))
			.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

		return clone(typeof filter.limit === 'number' ? tasks.slice(0, filter.limit) : tasks);
	}

	async deleteTask(taskId: TaskId): Promise<void> {
		this.tasks.delete(taskId);
		this.eventsByTask.delete(taskId);
	}

	async appendEvent(event: TaskEvent): Promise<void> {
		if (!event.taskId) return;
		const events = this.eventsByTask.get(event.taskId) ?? [];
		events.push(clone(event));
		this.eventsByTask.set(event.taskId, events);
	}

	async getEvents(taskId: TaskId): Promise<TaskEvent[]> {
		return clone(this.eventsByTask.get(taskId) ?? []);
	}

	async createAttempt(attempt: TaskAttempt): Promise<void> {
		this.attempts.set(attempt.id, clone(attempt));
	}

	async updateAttempt(attemptId: string, patch: Partial<TaskAttempt>): Promise<void> {
		const attempt = this.attempts.get(attemptId);
		if (!attempt) throw new TaskStoreError(`Task attempt not found: ${attemptId}`);
		this.attempts.set(attemptId, { ...attempt, ...clone(patch), id: attempt.id });
	}

	async acquireLock(taskId: TaskId, workerId: string, ttlMs: number): Promise<boolean> {
		const task = await this.getTask(taskId);
		const now = Date.now();
		if (task.lockedBy && task.lockExpiresAt && Date.parse(task.lockExpiresAt) > now && task.lockedBy !== workerId) {
			return false;
		}
		await this.updateTask(taskId, {
			lockedBy: workerId,
			lockExpiresAt: new Date(now + ttlMs).toISOString(),
		});
		return true;
	}

	async releaseLock(taskId: TaskId, workerId: string): Promise<void> {
		const task = await this.getTask(taskId);
		if (task.lockedBy && task.lockedBy !== workerId) return;
		await this.updateTask(taskId, {
			lockedBy: undefined,
			lockExpiresAt: undefined,
		});
	}

	async listRecoverableTasks(): Promise<Task[]> {
		const recoverableStatuses: TaskStatus[] = ['queued', 'scheduled', 'running', 'retrying', 'waitingForDependency'];
		const now = Date.now();
		return clone(
			[...this.tasks.values()].filter((task) => {
				if (!recoverableStatuses.includes(task.status)) return false;
				if (!task.lockExpiresAt) return true;
				return Date.parse(task.lockExpiresAt) <= now;
			})
		);
	}

	async createWorkflow(workflow: Workflow): Promise<void> {
		if (this.workflows.has(workflow.workflowId)) {
			throw new TaskStoreError(`Workflow already exists: ${workflow.workflowId}`);
		}
		this.workflows.set(workflow.workflowId, clone(workflow));
	}

	async updateWorkflow(workflowId: WorkflowId, patch: Partial<Workflow>): Promise<void> {
		const workflow = await this.getWorkflow(workflowId);
		this.workflows.set(workflowId, {
			...workflow,
			...clone(patch),
			workflowId,
			metadata: {
				...workflow.metadata,
				...(patch.metadata ?? {}),
			},
			audit: patch.audit ?? workflow.audit,
		});
	}

	async getWorkflow(workflowId: WorkflowId): Promise<Workflow> {
		const workflow = this.workflows.get(workflowId);
		if (!workflow) throw new TaskStoreError(`Workflow not found: ${workflowId}`);
		return clone(workflow);
	}

	async listWorkflows(filter: WorkflowListFilter = {}): Promise<Workflow[]> {
		const workflows = [...this.workflows.values()]
			.filter((workflow) => matchesValue(workflow.status, filter.status))
			.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
		return clone(typeof filter.limit === 'number' ? workflows.slice(0, filter.limit) : workflows);
	}
}
