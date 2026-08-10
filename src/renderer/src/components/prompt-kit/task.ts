export const TASK_TOOL_LABELS: Record<string, { readonly running: string; readonly done: string }> =
	{
		create_task: { running: 'Scheduling task', done: 'Task scheduled' },
		update_task: { running: 'Updating task', done: 'Task updated' },
		delete_task: { running: 'Deleting task', done: 'Task deleted' },
		get_task: { running: 'Loading task', done: 'Task loaded' },
		list_tasks: { running: 'Loading tasks', done: 'Tasks loaded' },
		pause_task: { running: 'Pausing task', done: 'Task paused' },
		resume_task: { running: 'Resuming task', done: 'Task resumed' },
		run_task_now: { running: 'Running task', done: 'Task started' },
	};

export function isTaskToolType(type: string): boolean {
	return type.toLowerCase() in TASK_TOOL_LABELS;
}
