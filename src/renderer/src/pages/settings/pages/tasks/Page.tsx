import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

type Task = Awaited<ReturnType<typeof window.tasks.list>>[number];

function describeAction(task: Task): string {
	return task.action.type === 'agent' ? task.action.prompt : task.action.message;
}

const TasksPage: React.FC = () => {
	const { t } = useTranslation();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void window.tasks
			.list()
			.then((list) => {
				if (mounted) setTasks(list);
			})
			.catch((err: unknown) => {
				if (mounted) setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.taskScheduler')}
				description={t('settings.cron.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.cron.schedulesTitle')}
				description={t('settings.cron.schedulesDescription')}
			>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : tasks.length === 0 ? (
						<SettingsEmptyState
							icon={ListChecks}
							title={t('settings.cron.emptyTitle')}
							description={t('settings.cron.emptyDescription')}
						/>
					) : (
						tasks.map((task) => (
							<Item
								key={task.id}
								variant="outline"
								size="md"
								className="border-b border-border/60 last:border-b-0"
							>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="max-w-full truncate">{task.name}</ItemTitle>
									<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground">
										{describeAction(task)}
									</p>
									{task.cronExpression && (
										<code className="text-[11px] text-muted-foreground">{task.cronExpression}</code>
									)}
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end">
									<Badge variant={task.enabled ? 'default' : 'secondary'} className="text-[10px] leading-none">
										{task.enabled ? t('settings.cron.enabled') : t('settings.cron.disabled')}
									</Badge>
								</ItemActions>
							</Item>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default TasksPage;
