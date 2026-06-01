import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
	AlertCircle,
	Clock3,
	LoaderCircle,
	Pause,
	Play,
	Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CronSchedule } from '../../../../../../shared/cron';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import {
	formatSchedule,
	formatTimestamp,
	inputSummary,
	sortSchedules,
	statusLabelKey,
	statusVariant,
} from './utils';

function CronLoadingList(): React.JSX.Element {
	return (
		<SettingsPanel>
			<div className="grid gap-0">
				{[0, 1, 2].map((index) => (
					<div
						key={index}
						className="flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0"
					>
						<Skeleton className="size-6 rounded-md" />
						<div className="min-w-0 flex-1">
							<Skeleton className="h-4 w-48 max-w-full" />
							<Skeleton className="mt-2 h-3 w-72 max-w-full" />
						</div>
						<Skeleton className="h-7 w-20 rounded-md" />
					</div>
				))}
			</div>
		</SettingsPanel>
	);
}

function scheduleActionLabel(schedule: CronSchedule): string {
	return schedule.status === 'active' ? 'settings.cron.actions.pause' : 'settings.cron.actions.resume';
}

const CronPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [schedules, setSchedules] = useState<readonly CronSchedule[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const loadSchedules = useCallback(async (showLoading = false): Promise<void> => {
		if (showLoading) setLoading(true);
		try {
			const nextSchedules = await window.cron.listSchedules({ includeDeleted: false });
			setSchedules(sortSchedules(nextSchedules));
			setError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		let mounted = true;

		async function loadInitialSchedules(): Promise<void> {
			setLoading(true);
			try {
				const nextSchedules = await window.cron.listSchedules({ includeDeleted: false });
				if (!mounted) return;
				setSchedules(sortSchedules(nextSchedules));
				setError(null);
			} catch (caught) {
				if (mounted) setError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void loadInitialSchedules();
		const unsubscribe = window.cron.subscribeToSchedules(() => {
			void loadSchedules(false);
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, [loadSchedules]);

	const navigateToSchedule = (scheduleId: string): void => {
		navigate(`/settings/cron/crondetails/${encodeURIComponent(scheduleId)}`);
	};

	const toggleSchedule = async (
		schedule: CronSchedule,
		event: React.MouseEvent<HTMLButtonElement>
	): Promise<void> => {
		event.stopPropagation();
		setBusyId(`toggle:${schedule.id}`);
		setError(null);
		try {
			if (schedule.status === 'active') {
				await window.cron.pauseSchedule(schedule.id);
			} else {
				await window.cron.resumeSchedule(schedule.id);
			}
			await loadSchedules(false);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusyId(null);
		}
	};

	const runSchedule = async (
		schedule: CronSchedule,
		event: React.MouseEvent<HTMLButtonElement>
	): Promise<void> => {
		event.stopPropagation();
		setBusyId(`run:${schedule.id}`);
		setError(null);
		try {
			await window.cron.runNow(schedule.id);
			await loadSchedules(false);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusyId(null);
		}
	};

	const deleteSchedule = async (
		schedule: CronSchedule,
		event: React.MouseEvent<HTMLButtonElement>
	): Promise<void> => {
		event.stopPropagation();
		if (!window.confirm(t('settings.cron.actions.confirmRemove', { id: schedule.name }))) return;

		setBusyId(`delete:${schedule.id}`);
		setError(null);
		try {
			await window.cron.deleteSchedule(schedule.id);
			await loadSchedules(false);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusyId(null);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.taskScheduler')} />

			<SettingsSection title={t('settings.sections.taskScheduler')}>
				{error && (
					<SettingsPanel>
						<div className="flex min-w-0 items-start gap-2 px-3 py-2 text-destructive">
							<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
							<div className="min-w-0 text-xs leading-5">{error}</div>
						</div>
					</SettingsPanel>
				)}

				{loading ? (
					<CronLoadingList />
				) : schedules.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Clock3}
							title={t('settings.cron.emptyTitle')}
							description={t('settings.cron.emptyDescription')}
							className="min-h-28"
						/>
					</SettingsPanel>
				) : (
					<SettingsPanel>
						<div className="grid gap-0">
							{schedules.map((schedule) => {
								const toggleBusy = busyId === `toggle:${schedule.id}`;
								const runBusy = busyId === `run:${schedule.id}`;
								const deleteBusy = busyId === `delete:${schedule.id}`;
								const anyBusy = Boolean(busyId);

								return (
									<div
										key={schedule.id}
										role="button"
										tabIndex={0}
										onClick={() => navigateToSchedule(schedule.id)}
										onKeyDown={(event) => {
											if (event.key !== 'Enter' && event.key !== ' ') return;
											event.preventDefault();
											navigateToSchedule(schedule.id);
										}}
										className="grid gap-2 border-b border-border/60 px-3 py-2 outline-none last:border-b-0 focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
									>
										<div className="flex min-w-0 items-start gap-2">
											<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
												<Clock3 className="size-3" strokeWidth={1.8} />
											</span>
											<div className="min-w-0 flex-1">
												<div className="truncate text-[13px] font-medium text-foreground">
													{schedule.name}
												</div>
												<div className="mt-1 flex flex-wrap items-center gap-1.5">
													<Badge
														variant={statusVariant(schedule.status)}
														className="h-4 px-1.5 text-[10px]"
													>
														{t(statusLabelKey(schedule.status))}
													</Badge>
													<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
														{schedule.taskType}
													</Badge>
													<Badge
														variant="outline"
														className="h-4 max-w-full px-1.5 font-mono text-[10px]"
													>
														<span className="truncate">{formatSchedule(schedule)}</span>
													</Badge>
													<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
														{t('settings.cron.nextRun')}: {formatTimestamp(schedule.nextRunAt)}
													</Badge>
												</div>
												{schedule.description || schedule.taskInput ? (
													<p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
														{schedule.description || inputSummary(schedule)}
													</p>
												) : null}
											</div>
										</div>

										<div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
											<Button
												type="button"
												size="xs"
												variant="outline"
												disabled={anyBusy || schedule.status === 'deleted'}
												onClick={(event) => void toggleSchedule(schedule, event)}
												aria-label={t(scheduleActionLabel(schedule))}
											>
												{toggleBusy ? (
													<LoaderCircle className="size-3 animate-spin" />
												) : schedule.status === 'active' ? (
													<Pause className="size-3" />
												) : (
													<Play className="size-3" />
												)}
												{t(scheduleActionLabel(schedule))}
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												disabled={anyBusy || schedule.status === 'deleted'}
												onClick={(event) => void runSchedule(schedule, event)}
												aria-label={t('settings.cron.actions.run')}
											>
												{runBusy ? (
													<LoaderCircle className="size-3 animate-spin" />
												) : (
													<Play className="size-3" />
												)}
												{t('settings.cron.actions.run')}
											</Button>
											<Button
												type="button"
												size="icon-xs"
												variant="destructive"
												disabled={anyBusy}
												onClick={(event) => void deleteSchedule(schedule, event)}
												aria-label={t('settings.cron.actions.removeLabel', { id: schedule.name })}
											>
												{deleteBusy ? (
													<LoaderCircle className="size-3 animate-spin" />
												) : (
													<Trash2 className="size-3" />
												)}
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</SettingsPanel>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default CronPage;
