import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { CronTaskView } from '../../../../../shared/cron';

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
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-3">
			<header className="flex flex-wrap items-start justify-between gap-3 pb-1">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-tight tracking-normal">
						{t('settings.tabs.cron')}
					</h1>
					<p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
						{t('settings.sections.cron')}
					</p>
				</div>
			</header>

			<section className="flex flex-col gap-2">
				<h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
					{t('settings.sections.cron')}
				</h2>

				{cronTasks.length === 0 ? (
					<Card size="sm" className="gap-0 py-0">
						<CardContent className="p-0">
							<Empty className="min-h-24 gap-3 border-0 p-4">
								<EmptyHeader className="gap-1.5">
									<EmptyMedia variant="icon" className="mb-1 size-7">
										<Clock3 className="size-3.5" />
									</EmptyMedia>
									<EmptyTitle className="text-[13px]">{t('settings.cron.emptyTitle')}</EmptyTitle>
									<EmptyDescription className="text-xs leading-snug">
										{t('settings.cron.emptyDescription')}
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-2">
						{cronTasks.map((task) => {
							const payloadEntries = getPayloadEntries(task);
							const summary = getTaskSummary(task);

							return (
								<Card key={task.id} size="sm" className="gap-0 py-0">
									<CardContent className="flex flex-col p-0">
										<div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-3 py-2">
											<div className="flex min-w-0 items-start gap-2">
												<div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40">
													<Clock3 className="size-3.5 text-foreground" />
												</div>
												<div className="min-w-0">
													<h3 className="truncate text-[13px] font-semibold" title={summary}>
														{summary}
													</h3>
													<div className="mt-1 flex flex-wrap items-center gap-1.5">
														<Badge variant="outline" className="text-[10px]">
															{task.data.type}
														</Badge>
														<Badge variant="outline" className="font-mono text-[10px]">
															{task.expression}
														</Badge>
													</div>
												</div>
											</div>
											<Button
												type="button"
												variant="destructive"
												size="icon-xs"
												onClick={() => void handleRemoveTask(task.id)}
												aria-label={t('settings.cron.actions.removeLabel', { id: task.id })}
												title={t('settings.cron.actions.remove')}
											>
												<Trash2 className="size-3" />
											</Button>
										</div>

										<dl className="grid gap-2 border-b border-border/70 bg-muted/10 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
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
											<div className="px-3 py-2">
												<div className="text-[11px] font-medium text-muted-foreground">
													{t('settings.cron.details.payload')}
												</div>
												<dl className="mt-1.5 grid gap-2 sm:grid-cols-2">
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
			</section>
		</div>
	);
};

export default CronPage;
