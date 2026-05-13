import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type { CronTaskView } from '../../../../../shared/cron';

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
		<div className="w-full">
			<section>
				<h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.sections.cron')}
				</h2>

				<Card className="gap-0 py-0">
					<CardContent className="overflow-hidden p-0">
						<Table>
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
											<Empty className="border-0 p-0">
												<EmptyHeader>
													<EmptyMedia variant="icon">
														<Clock3 className="size-4" />
													</EmptyMedia>
													<EmptyTitle>{t('settings.cron.emptyTitle')}</EmptyTitle>
													<EmptyDescription>{t('settings.cron.emptyDescription')}</EmptyDescription>
												</EmptyHeader>
											</Empty>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default CronPage;
