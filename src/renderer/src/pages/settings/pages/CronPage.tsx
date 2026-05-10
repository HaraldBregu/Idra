import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/Empty';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import type { CronTask } from '../../../../shared/cron';

const CronPage: React.FC = () => {
	const { t } = useTranslation();
	const [cronTasks, setCronTasks] = useState<readonly CronTask[]>([]);

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

	return (
		<div className="w-full">
			<h1 className="text-lg font-normal mb-4">{t('settings.tabs.cron')}</h1>

			<div className="pt-0 pb-2">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{t('settings.sections.cron')}
				</h2>
			</div>

			<div className="overflow-hidden rounded-md border border-border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t('settings.cron.columns.name')}</TableHead>
							<TableHead>{t('settings.cron.columns.schedule')}</TableHead>
							<TableHead>{t('settings.cron.columns.status')}</TableHead>
							<TableHead>{t('settings.cron.columns.lastRun')}</TableHead>
							<TableHead>{t('settings.cron.columns.nextRun')}</TableHead>
							<TableHead className="text-right">{t('settings.cron.columns.actions')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{cronTasks.map((task) => (
							<TableRow key={task.id}>
								<TableCell className="font-medium">{task.id}</TableCell>
								<TableCell className="font-mono text-xs">{task.expression}</TableCell>
								<TableCell>
									<Badge variant="secondary">{t('settings.cron.status.active')}</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">—</TableCell>
								<TableCell className="text-muted-foreground">—</TableCell>
								<TableCell className="text-right text-muted-foreground">
									{t('settings.cron.actions.placeholder')}
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
			</div>
		</div>
	);
};

export default CronPage;
