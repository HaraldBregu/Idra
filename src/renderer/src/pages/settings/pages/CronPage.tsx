import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type { CronTaskView } from '../../../../../shared/cron';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../components';

function formatTimestamp(value: string | undefined): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString();
}

const CronPage: React.FC = () => {
	const { t } = useTranslation();
	const [cronTasks, setCronTasks] = useState<readonly CronTaskView[]>([]);

	useEffect(() => {
		let mounted = true;

		window.cron
			.list()
			.then((tasks) => {
				if (mounted) setCronTasks(tasks);
			})
			.catch((error) => {
				console.error('[CronPage] Failed to load cron tasks:', error);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const handleRemoveTask = async (taskId: string): Promise<void> => {
		try {
			await window.cron.remove(taskId);
			setCronTasks((tasks) => tasks.filter((task) => task.id !== taskId));
		} catch (error) {
			console.error('[CronPage] Failed to remove cron task:', error);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				icon={CalendarClock}
				title={t('settings.tabs.cron')}
				description={t('settings.sections.cron')}
			/>

			<SettingsSection title={t('settings.sections.cron')}>
				<SettingsPanel>
					<div className="overflow-x-auto">
						<Table className="min-w-[780px]">
							<TableHeader>
								<TableRow>
									<TableHead className="w-24 max-w-24">{t('settings.cron.columns.id')}</TableHead>
									<TableHead>{t('settings.cron.columns.message')}</TableHead>
									<TableHead>{t('settings.cron.columns.schedule')}</TableHead>
									<TableHead>{t('settings.cron.columns.lastRun')}</TableHead>
									<TableHead>{t('settings.cron.columns.nextRun')}</TableHead>
									<TableHead className="text-right">{t('settings.cron.columns.actions')}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{cronTasks.map((task) => (
									<TableRow key={task.id}>
										<TableCell className="w-24 max-w-24 truncate font-medium" title={task.id}>
											{task.id}
										</TableCell>
										<TableCell className="font-mono text-xs">{task.data.type}</TableCell>
										<TableCell className="font-mono text-xs">{task.expression}</TableCell>
										<TableCell className="text-muted-foreground">
											{formatTimestamp(task.lastRun)}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{formatTimestamp(task.nextRun)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												type="button"
												variant="destructive"
												size="icon-sm"
												onClick={() => void handleRemoveTask(task.id)}
												aria-label={t('settings.cron.actions.removeLabel', { id: task.id })}
												title={t('settings.cron.actions.remove')}
											>
												<Trash2 className="size-3.5" />
											</Button>
										</TableCell>
									</TableRow>
								))}
								{cronTasks.length === 0 && (
									<TableRow>
										<TableCell colSpan={6} className="py-8">
											<SettingsEmptyState
												icon={Clock3}
												title={t('settings.cron.emptyTitle')}
												description={t('settings.cron.emptyDescription')}
												className="min-h-32"
											/>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default CronPage;
