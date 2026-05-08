import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import type { TaskEvent, TaskInfo } from '../../../../../../shared/types';
import type { QueueStats, TaskEventRecord, TrackedTask } from './types';
import { TaskRow } from './TaskRow';
import { LogPanel } from './LogPanel';
import { TaskDataDialog } from './TaskDataDialog';

const MAX_EVENT_HISTORY = 50;
const EMPTY_STATS: QueueStats = {
	queued: 0,
	running: 0,
	finished: 0,
	cancelled: 0,
};

type Action =
	| { type: 'hydrate'; tasks: TaskInfo[] }
	| { type: 'event'; event: TaskEvent }
	| { type: 'hide'; taskId: string };

function dataField<T>(data: unknown, key: string): T | undefined {
	if (typeof data === 'object' && data !== null && key in data) {
		return (data as Record<string, unknown>)[key] as T;
	}
	return undefined;
}

function createFromInfo(info: TaskInfo): TrackedTask {
	return {
		taskId: info.taskId,
		type: info.type,
		status: info.status,
		priority: info.priority,
		progress: { percent: info.status === 'finished' ? 100 : 0 },
		durationMs: info.durationMs,
		error: info.error,
		metadata: info.metadata,
		events: [],
	};
}

function createFromEvent(event: TaskEvent): TrackedTask {
	const metadata =
		event.metadata !== undefined && event.metadata !== null
			? (event.metadata as Record<string, unknown>)
			: undefined;
	return {
		taskId: event.taskId,
		type: '',
		status: event.state,
		priority: 'normal',
		progress: { percent: 0 },
		metadata,
		events: [],
	};
}

function appendEvent(task: TrackedTask, event: TaskEvent): TaskEventRecord[] {
	const record: TaskEventRecord = {
		state: event.state,
		data: { taskId: event.taskId, data: event.data, metadata: event.metadata },
		receivedAt: Date.now(),
	};
	const base =
		task.events.length >= MAX_EVENT_HISTORY ? task.events.slice(1) : task.events.slice();
	base.push(record);
	return base;
}

function applyEvent(task: TrackedTask, event: TaskEvent): TrackedTask {
	const events = appendEvent(task, event);
	const metadata =
		event.metadata !== undefined && event.metadata !== null
			? (event.metadata as Record<string, unknown>)
			: task.metadata;

	const base: TrackedTask = { ...task, events, metadata };

	switch (event.state) {
		case 'queued':
		case 'started':
			return { ...base, status: event.state };
		case 'running': {
			const streamData = dataField<string>(event.data, 'data');
			if (typeof streamData === 'string' && streamData.length > 0) {
				return { ...base, status: 'running' };
			}
			return {
				...base,
				status: 'running',
				progress: {
					percent: dataField<number>(event.data, 'percent') ?? 0,
					message: dataField<string>(event.data, 'message'),
					detail: dataField<unknown>(event.data, 'detail'),
				},
			};
		}
		case 'finished':
			return {
				...base,
				status: 'finished',
				progress: { percent: 100 },
				result: event.data.success ? event.data.data : undefined,
				durationMs: dataField<number>(event.data, 'durationMs'),
			};
		case 'cancelled': {
			const errorMessage =
				!event.data.success && event.data.error.length > 0 ? event.data.error : undefined;
			return { ...base, status: 'cancelled', error: errorMessage };
		}
		default:
			return base;
	}
}

function reducer(state: TrackedTask[], action: Action): TrackedTask[] {
	switch (action.type) {
		case 'hydrate': {
			let next = state;
			for (const info of action.tasks) {
				const index = next.findIndex((t) => t.taskId === info.taskId);
				if (index === -1) {
					next = [...next, createFromInfo(info)];
				} else {
					const current = next[index];
					const merged: TrackedTask = {
						...current,
						type: info.type || current.type,
						status: info.status,
						priority: info.priority,
						durationMs: info.durationMs ?? current.durationMs,
						error: info.error ?? current.error,
						metadata: info.metadata ?? current.metadata,
						progress: info.status === 'finished' ? { percent: 100 } : current.progress,
					};
					next = [...next.slice(0, index), merged, ...next.slice(index + 1)];
				}
			}
			return next;
		}
		case 'event': {
			const { event } = action;
			if (!event.taskId) return state;
			const index = state.findIndex((t) => t.taskId === event.taskId);
			if (index === -1) {
				if (event.state !== 'queued') return state;
				return [...state, applyEvent(createFromEvent(event), event)];
			}
			const next = applyEvent(state[index], event);
			return [...state.slice(0, index), next, ...state.slice(index + 1)];
		}
		case 'hide':
			return state.filter((t) => t.taskId !== action.taskId);
		default:
			return state;
	}
}

function computeQueueStats(tasks: TrackedTask[]): QueueStats {
	return tasks.reduce<QueueStats>(
		(stats, task) => {
			if (task.status in stats) {
				stats[task.status as keyof QueueStats] += 1;
			}
			return stats;
		},
		{ ...EMPTY_STATS }
	);
}

export function TasksTab() {
	const { t } = useTranslation();
	const [tasks, dispatch] = useReducer(reducer, [] as TrackedTask[]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dataDialogId, setDataDialogId] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window.app.task?.list !== 'function') return;
		window.app.task.list().then((res) => {
			if (!res.success) return;
			dispatch({ type: 'hydrate', tasks: res.data });
		});
	}, []);

	useEffect(() => {
		if (typeof window.app.task?.onEvent !== 'function') return;
		return window.app.task.onEvent((event) => {
			dispatch({ type: 'event', event });
		});
	}, []);

	const queueStats = useMemo(() => computeQueueStats(tasks), [tasks]);
	const selectedTask = tasks.find((task) => task.taskId === selectedId) ?? null;
	const dataDialogTask = tasks.find((task) => task.taskId === dataDialogId) ?? null;

	const handleSelect = useCallback((taskId: string) => {
		setSelectedId((prev) => (prev === taskId ? null : taskId));
	}, []);

	const handleHide = useCallback(
		(taskId: string) => {
			if (selectedId === taskId) setSelectedId(null);
			dispatch({ type: 'hide', taskId });
		},
		[selectedId]
	);

	const handleCancel = useCallback(async (taskId: string) => {
		if (typeof window.app.task?.cancel !== 'function') return;
		await window.app.task.cancel(taskId);
	}, []);

	return (
		<div className="flex flex-1 min-h-0">
			<div className="flex flex-col flex-1 min-w-0 min-h-0">
				<div className="px-6 py-3 border-b shrink-0">
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span>
							<span className="font-medium text-foreground">{queueStats.running}</span>{' '}
							{t('debug.running')}
						</span>
						<span>
							<span className="font-medium text-foreground">{queueStats.queued}</span>{' '}
							{t('debug.queued')}
						</span>
						<span>
							<span className="font-medium text-foreground">{queueStats.finished}</span>{' '}
							{t('debug.completed')}
						</span>
						{queueStats.cancelled > 0 && (
							<span className="text-destructive">
								<span className="font-medium">{queueStats.cancelled}</span> {t('debug.errors')}
							</span>
						)}
					</div>
				</div>

				<div className="flex-1 overflow-auto">
					{tasks.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
							<Bug className="h-10 w-10 opacity-20" />
							<p className="text-sm">{t('debug.noTasksYet')}</p>
							<p className="text-xs opacity-60">{t('debug.tasksWillAppear')}</p>
						</div>
					) : (
						<table className="w-full text-left">
							<thead className="border-b sticky top-0 bg-background z-10">
								<tr>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.id')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.type')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.status')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.priority')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.progress')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.duration')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.actions')}
									</th>
								</tr>
							</thead>
							<tbody>
								{tasks.map((task) => (
									<TaskRow
										key={task.taskId}
										task={task}
										isSelected={selectedId === task.taskId}
										onSelect={() => handleSelect(task.taskId)}
										onCancel={() => handleCancel(task.taskId)}
										onHide={() => handleHide(task.taskId)}
										onViewData={() => setDataDialogId(task.taskId)}
									/>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{selectedTask && <LogPanel task={selectedTask} onClose={() => setSelectedId(null)} />}

			<TaskDataDialog
				task={dataDialogTask}
				open={dataDialogId !== null}
				onOpenChange={(open) => {
					if (!open) setDataDialogId(null);
				}}
			/>
		</div>
	);
}
