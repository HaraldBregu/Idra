import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskRecord } from '../../../../../../shared/tasks';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import {
	formatTimestamp,
	sortTasks,
	taskStatusLabelKey,
	taskStatusVariant,
} from './utils';

function TaskLoadingList(): React.JSX.Element {
	return (
		<SettingsPanel>
			<div className="grid gap-0">
				{[0, 1, 2].map((index) => (
					<div key={index} className="flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0">
						<Skeleton className="size-6 rounded-md" />
						<div className="min-w-0 flex-1">
							<Skeleton className="h-4 w-48 max-w-full" />
							<Skeleton className="mt-2 h-3 w-72 max-w-full" />
						</div>
						<Skeleton className="h-4 w-16 rounded-full" />
					</div>
				))}
			</div>
		</SettingsPanel>
	);
}

const TaskManagerPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [tasks, setTasks] = useState<readonly TaskRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		setLoading(true);
		window.tasks
			.list()
			.then((nextTasks) => {
				if (!mounted) return;
				setTasks(sortTasks(nextTasks));
				setError(null);
			})
			.catch((caught) => {
				if (mounted) setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		return window.tasks.onEvent((event) => {
			setTasks((current) => sortTasks([
				event.task,
				...current.filter((task) => task.id !== event.task.id),
			]));
		});
	}, []);

	const navigateToTask = (taskId: string): void => {
		navigate(`/settings/task-manager/taskdetails/${encodeURIComponent(taskId)}`);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.taskManager')}
				description={t('settings.taskManager.description')}
			/>
			<SettingsSection title={t('settings.sections.taskManager')}>
				{error && (
					<SettingsPanel>
						<div className="flex min-w-0 items-start gap-2 px-3 py-2 text-destructive">
							<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
							<div className="min-w-0 text-xs leading-5">{error}</div>
						</div>
					</SettingsPanel>
				)}

				{loading ? (
					<TaskLoadingList />
				) : tasks.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={ClipboardList}
							title={t('settings.taskManager.emptyTitle')}
							description={t('settings.taskManager.emptyDescription')}
							className="min-h-28"
						/>
					</SettingsPanel>
				) : (
					<SettingsPanel>
						{tasks.map((task) => (
							<Item
								key={task.id}
								as="button"
								type="button"
								onClick={() => navigateToTask(task.id)}
								variant="outline"
								size="md"
								className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
							>
								<ItemMedia variant="icon">
									<ClipboardList className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
										{task.title}
									</ItemTitle>
									<div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-muted-foreground">
										<span className="max-w-56 truncate font-mono">{task.type}</span>
										<span>{formatTimestamp(task.createdAt)}</span>
									</div>
								</ItemContent>
								<ItemActions className="ml-auto flex-none items-center justify-end gap-1.5">
									<Badge
										variant={taskStatusVariant(task.status)}
										className="h-4 px-1.5 text-[10px]"
									>
										{t(taskStatusLabelKey(task.status))}
									</Badge>
									<ChevronRight
										className="size-3 shrink-0 text-muted-foreground"
										strokeWidth={1.8}
									/>
								</ItemActions>
							</Item>
						))}
					</SettingsPanel>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default TaskManagerPage;
