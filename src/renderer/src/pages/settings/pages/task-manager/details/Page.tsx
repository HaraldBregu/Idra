import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskRecord } from '../../../../../../../shared/tasks';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';
import {
	formatTaskValue,
	formatTimestamp,
	taskMetadataEntries,
	taskStatusLabelKey,
	taskStatusVariant,
} from '../utils';

function TaskDetail({
	label,
	value,
	mono,
}: {
	readonly label: React.ReactNode;
	readonly value: React.ReactNode;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<div className="min-w-0 rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5">
			<dt className="text-[10px] font-medium uppercase text-muted-foreground">{label}</dt>
			<dd
				className={
					mono
						? 'mt-0.5 min-w-0 break-words font-mono text-[11px] text-foreground'
						: 'mt-0.5 min-w-0 break-words text-xs text-foreground'
				}
			>
				{value}
			</dd>
		</div>
	);
}

const TaskDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const { taskId } = useParams<{ taskId: string }>();
	const [task, setTask] = useState<TaskRecord | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		if (!taskId) {
			setTask(null);
			setLoading(false);
			setError(t('settings.taskManager.notFoundDescription'));
			return () => {
				mounted = false;
			};
		}

		setLoading(true);
		window.tasks
			.get(taskId)
			.then((nextTask) => {
				if (!mounted) return;
				if (!nextTask) {
					setTask(null);
					setError(t('settings.taskManager.notFoundDescription'));
					return;
				}
				setTask(nextTask);
				setError(null);
			})
			.catch((caught) => {
				if (!mounted) return;
				setTask(null);
				setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, [taskId, t]);

	useEffect(() => {
		if (!taskId) return undefined;
		return window.tasks.onEvent((event) => {
			if (event.task.id === taskId) setTask(event.task);
		});
	}, [taskId]);

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.taskManager.detailsTitle')} />
				<SettingsPanel>
					<div className="px-3 py-2">
						<Skeleton className="h-5 w-56 max-w-full" />
						<Skeleton className="mt-3 h-16 w-full" />
					</div>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (!task) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.taskManager.detailsTitle')} />
				<SettingsPanel>
					<SettingsEmptyState
						icon={ClipboardList}
						title={t('settings.taskManager.notFoundTitle')}
						description={error ?? t('settings.taskManager.notFoundDescription')}
						className="min-h-28"
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	const metadataEntries = taskMetadataEntries(task);
	const result = task.result === undefined ? null : formatTaskValue(task.result);
	const progress = task.progress;

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={task.title}
				description={task.type}
				action={
					<Badge
						variant={taskStatusVariant(task.status)}
						className="h-5 px-2 text-[11px]"
					>
						{t(taskStatusLabelKey(task.status))}
					</Badge>
				}
			/>

			{error && (
				<SettingsPanel>
					<div className="flex min-w-0 items-start gap-2 px-3 py-2 text-destructive">
						<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
						<div className="min-w-0 text-xs leading-5">{error}</div>
					</div>
				</SettingsPanel>
			)}

			<SettingsSection hideTitle title={t('settings.taskManager.details')}>
				<SettingsPanel>
					<dl className="grid gap-2 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
						<TaskDetail label={t('settings.taskManager.fields.id')} value={task.id} mono />
						<TaskDetail label={t('settings.taskManager.fields.type')} value={task.type} mono />
						<TaskDetail label={t('settings.taskManager.fields.createdAt')} value={formatTimestamp(task.createdAt)} />
						<TaskDetail label={t('settings.taskManager.fields.startedAt')} value={formatTimestamp(task.startedAt)} />
						<TaskDetail label={t('settings.taskManager.fields.finishedAt')} value={formatTimestamp(task.finishedAt)} />
					</dl>
				</SettingsPanel>
			</SettingsSection>

			{progress && (
				<SettingsSection title={t('settings.taskManager.progress')}>
					<SettingsPanel>
						<dl className="grid gap-2 px-3 py-2 sm:grid-cols-3">
							<TaskDetail
								label={t('settings.taskManager.fields.current')}
								value={formatTaskValue(progress.current)}
							/>
							<TaskDetail
								label={t('settings.taskManager.fields.total')}
								value={formatTaskValue(progress.total)}
							/>
							<TaskDetail
								label={t('settings.taskManager.fields.message')}
								value={formatTaskValue(progress.message)}
							/>
						</dl>
					</SettingsPanel>
				</SettingsSection>
			)}

			{metadataEntries.length > 0 && (
				<SettingsSection title={t('settings.taskManager.metadata')}>
					<SettingsPanel>
						<dl className="grid gap-2 px-3 py-2 sm:grid-cols-2">
							{metadataEntries.map(([key, value]) => (
								<TaskDetail key={key} label={key} value={value} mono />
							))}
						</dl>
					</SettingsPanel>
				</SettingsSection>
			)}

			{task.error && (
				<SettingsSection title={t('settings.taskManager.error')}>
					<SettingsPanel>
						<dl className="grid gap-2 px-3 py-2 sm:grid-cols-2">
							<TaskDetail label={t('settings.taskManager.fields.code')} value={task.error.code} mono />
							<TaskDetail label={t('settings.taskManager.fields.message')} value={task.error.message} />
						</dl>
					</SettingsPanel>
				</SettingsSection>
			)}

			{result && (
				<SettingsSection title={t('settings.taskManager.result')}>
					<SettingsPanel>
						<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-5 text-foreground">
							{result}
						</pre>
					</SettingsPanel>
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default TaskDetailsPage;
