import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

function formatDetailValue(value: unknown): string {
	if (value === undefined || value === null || value === '') return '—';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

function getTaskSummary(task: CronTaskView): string {
	const candidates = [
		(task.data as { message?: unknown }).message,
		(task.data as { prompt?: unknown }).prompt,
		(task.data as { action?: unknown }).action,
	];
	const summary = candidates.find(
		(value): value is string => typeof value === 'string' && value.trim().length > 0
	);
	return summary?.trim() ?? task.data.type;
}

function getPayloadEntries(task: CronTaskView): readonly (readonly [string, string])[] {
	return Object.entries(task.data)
		.filter(([key]) => key !== 'type')
		.map(([key, value]) => [key, formatDetailValue(value)] as const)
		.filter(([, value]) => value !== '—');
}

function CronDetail({
	label,
	value,
	mono,
}: {
	readonly label: React.ReactNode;
	readonly value: React.ReactNode;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<div className="min-w-0 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
			<dt className="text-[11px] font-medium uppercase text-muted-foreground">{label}</dt>
			<dd
				className={
					mono
						? 'mt-1 min-w-0 break-words font-mono text-xs text-foreground'
						: 'mt-1 min-w-0 break-words text-sm text-foreground'
				}
			>
				{value}
			</dd>
		</div>
	);
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
				{cronTasks.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Clock3}
							title={t('settings.cron.emptyTitle')}
							description={t('settings.cron.emptyDescription')}
							className="min-h-28"
						/>
					</SettingsPanel>
				) : (
					<div className="grid gap-3">
						{cronTasks.map((task) => {
							const payloadEntries = getPayloadEntries(task);
							const summary = getTaskSummary(task);

							return (
								<Card key={task.id} size="sm" className="gap-0 py-0">
									<CardContent className="flex flex-col p-0">
										<div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-2.5">
											<div className="flex min-w-0 items-start gap-3">
												<div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
													<Clock3 className="size-4 text-foreground" />
												</div>
												<div className="min-w-0">
													<h3 className="truncate text-sm font-semibold" title={summary}>
														{summary}
													</h3>
													<div className="mt-1.5 flex flex-wrap items-center gap-2">
														<Badge variant="outline">{task.data.type}</Badge>
														<Badge variant="outline" className="font-mono text-[11px]">
															{task.expression}
														</Badge>
													</div>
												</div>
											</div>
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
										</div>

										<dl className="grid gap-2.5 border-b border-border/70 bg-muted/10 px-4 py-2.5 sm:grid-cols-2 lg:grid-cols-4">
											<CronDetail label={t('settings.cron.details.id')} value={task.id} mono />
											<CronDetail
												label={t('settings.cron.details.schedule')}
												value={task.expression}
												mono
											/>
											<CronDetail
												label={t('settings.cron.details.timezone')}
												value={task.timezone ?? '—'}
											/>
											<CronDetail
												label={t('settings.cron.details.createdAt')}
												value={formatTimestamp(task.createdAt)}
											/>
											<CronDetail
												label={t('settings.cron.details.lastRun')}
												value={formatTimestamp(task.lastRun)}
											/>
											<CronDetail
												label={t('settings.cron.details.nextRun')}
												value={formatTimestamp(task.nextRun)}
											/>
										</dl>

										{payloadEntries.length > 0 && (
											<div className="px-4 py-2.5">
												<div className="text-xs font-medium text-muted-foreground">
													{t('settings.cron.details.payload')}
												</div>
												<dl className="mt-2 grid gap-2 sm:grid-cols-2">
													{payloadEntries.map(([key, value]) => (
														<CronDetail key={key} label={key} value={value} mono />
													))}
												</dl>
											</div>
										)}
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default CronPage;
