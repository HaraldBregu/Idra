import { randomUUID } from 'node:crypto';
import type { Task, TaskProgress, TaskStatus, TaskStore, Workflow, WorkflowCreateRequest, WorkflowId } from '../core/task.types';
import { EMPTY_PROGRESS } from '../core/task.types';
import { isTerminalStatus } from '../core/task.state-machine';

export class WorkflowManager {
	constructor(
		private readonly store: TaskStore,
		private readonly clock: () => Date = () => new Date()
	) {}

	async createWorkflow(request: WorkflowCreateRequest): Promise<Workflow> {
		const now = this.clock().toISOString();
		const workflow: Workflow = {
			workflowId: randomUUID(),
			title: request.title,
			description: request.description,
			rootTaskId: request.rootTaskId,
			taskIds: request.taskIds ?? [],
			status: 'pending',
			progress: EMPTY_PROGRESS(now),
			createdAt: now,
			updatedAt: now,
			metadata: request.metadata ?? {},
			audit: [],
		};
		await this.store.createWorkflow(workflow);
		return workflow;
	}

	async addTask(workflowId: WorkflowId, taskId: string): Promise<void> {
		const workflow = await this.store.getWorkflow(workflowId);
		if (workflow.taskIds.includes(taskId)) return;
		await this.store.updateWorkflow(workflowId, {
			taskIds: [...workflow.taskIds, taskId],
			updatedAt: this.clock().toISOString(),
		});
	}

	async refreshWorkflowProgress(workflowId: WorkflowId): Promise<Workflow> {
		const workflow = await this.store.getWorkflow(workflowId);
		const tasks = await this.store.listTasks({ workflowId, includeTerminal: true });
		const progress = this.aggregateProgress(tasks);
		const status = this.aggregateStatus(tasks);
		const now = this.clock().toISOString();
		const patch: Partial<Workflow> = { progress, status, updatedAt: now };
		if (status === 'completed') patch.completedAt = now;
		if (status === 'failed') patch.failedAt = now;
		if (status === 'cancelled') patch.cancelledAt = now;
		await this.store.updateWorkflow(workflowId, patch);
		return this.store.getWorkflow(workflowId);
	}

	private aggregateProgress(tasks: Task[]): TaskProgress {
		const now = this.clock().toISOString();
		if (tasks.length === 0) return EMPTY_PROGRESS(now);
		const completed = tasks.filter((task) => task.status === 'completed').length;
		const percentages = tasks.map((task) => task.progress.percentage ?? (task.status === 'completed' ? 100 : 0));
		return {
			percentage: Math.round(percentages.reduce((sum, value) => sum + value, 0) / tasks.length),
			totalSteps: tasks.length,
			completedSteps: completed,
			message: `${completed}/${tasks.length} tasks completed`,
			updatedAt: now,
		};
	}

	private aggregateStatus(tasks: Task[]): TaskStatus {
		if (tasks.length === 0) return 'pending';
		if (tasks.some((task) => task.status === 'failed' || task.status === 'timedOut')) return 'failed';
		if (tasks.some((task) => task.status === 'cancelled')) return 'cancelled';
		if (tasks.every((task) => task.status === 'completed')) return 'completed';
		if (tasks.some((task) => !isTerminalStatus(task.status))) return 'running';
		return 'skipped';
	}
}
