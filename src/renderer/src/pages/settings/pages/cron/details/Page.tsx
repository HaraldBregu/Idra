import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, LoaderCircle, Pause, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CronSchedule } from '../../../../../../../shared/cron';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';
import {
	formatSchedule,
	formatTimestamp,
	inputEntries,
	inputSummary,
	isCronSchedule,
	statusLabelKey,
	statusVariant,
} from '../utils';

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

function actionLabel(schedule: CronSchedule): string {
	return schedule.status === 'active' ? 'settings.cron.actions.pause' : 'settings.cron.actions.resume';
}

const CronDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { jobId } = useParams<{ jobId: string }>();
	const [schedule, setSchedule] = useState<CronSchedule | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyAction, setBusyAction] = useState<'toggle' | 'run' | 'delete' | null>(null);

	const loadSchedule = useCallback(async (): Promise<void> => {
		if (!jobId) {
			setLoading(false);
			setError(t('settings.cron.notFoundDescription'));
			return;
		}

		setLoading(true);
		try {
			const nextSchedule = await window.cron.getSchedule(jobId);
			if (!isCronSchedule(nextSchedule)) {
				throw new Error(t('settings.cron.notFoundDescription'));
			}
			setSchedule(nextSchedule);
			setError(null);
		} catch (caught) {
			setSchedule(null);
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setLoading(false);
		}
	}, [jobId, t]);

	useEffect(() => {
		let mounted = true;

		async function load(): Promise<void> {
			if (!mounted) return;
			await loadSchedule();
		}

		void load();

		return () => {
			mounted = false;
		};
	}, [loadSchedule]);

	const toggleSchedule = async (): Promise<void> => {
		if (!schedule) return;
		setBusyAction('toggle');
		setError(null);
		try {
			if (schedule.status === 'active') {
				await window.cron.pauseSchedule(schedule.id);
			} else {
				await window.cron.resumeSchedule(schedule.id);
			}
			await loadSchedule();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusyAction(null);
		}
	};

	const runSchedule = async (): Promise<void> => {
		if (!schedule) return;
		setBusyAction('run');
		setError(null);
		try {
			await window.cron.runNow(schedule.id);
			await loadSchedule();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusyAction(null);
		}
	};

	const deleteSchedule = async (): Promise<void> => {
		if (!schedule) return;
		if (!window.confirm(t('settings.cron.actions.confirmRemove', { id: schedule.name }))) return;

		setBusyAction('delete');
		setError(null);
		try {
			await window.cron.deleteSchedule(schedule.id);
			navigate('/settings/cron');
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
			setBusyAction(null);
		}
	};

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.cron.detailsTitle')} />
				<SettingsPanel>
					<div className="p-3">
						<Skeleton className="h-5 w-56 max-w-full" />
						<Skeleton className="mt-3 h-16 w-full" />
					</div>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (!schedule) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.cron.detailsTitle')} />
				<SettingsPanel>
					<SettingsEmptyState
						icon={Clock3}
						title={t('settings.cron.notFoundTitle')}
						description={error ?? t('settings.cron.notFoundDescription')}
						className="min-h-28"
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	const entries = inputEntries(schedule);
	const busy = busyAction !== null;

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={schedule.name}
				description={schedule.description}
				action={
					<>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={busy || schedule.status === 'deleted'}
							onClick={() => void toggleSchedule()}
						>
							{busyAction === 'toggle' ? (
								<LoaderCircle className="size-3 animate-spin" />
							) : schedule.status === 'active' ? (
								<Pause className="size-3" />
							) : (
								<Play className="size-3" />
							)}
							{t(actionLabel(schedule))}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={busy || schedule.status === 'deleted'}
							onClick={() => void runSchedule()}
						>
							{busyAction === 'run' ? (
								<LoaderCircle className="size-3 animate-spin" />
							) : (
								<Play className="size-3" />
							)}
							{t('settings.cron.actions.run')}
						</Button>
					</>
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

			<SettingsSection title={t('settings.cron.details.prompt')}>
				<SettingsPanel>
					<div className="px-3 py-2">
						<div className="mb-2 flex flex-wrap items-center gap-1.5">
							<Badge variant={statusVariant(schedule.status)} className="h-4 px-1.5 text-[10px]">
								{t(statusLabelKey(schedule.status))}
							</Badge>
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								{schedule.taskType}
							</Badge>
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								{schedule.type}
							</Badge>
						</div>
						<p className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
							{inputSummary(schedule)}
						</p>
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.cron.detailsTitle')}>
				<SettingsPanel>
					<dl className="grid gap-2 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
						<CronDetail label={t('settings.cron.details.id')} value={schedule.id} mono />
						<CronDetail label={t('settings.cron.details.schedule')} value={formatSchedule(schedule)} mono />
						<CronDetail label={t('settings.cron.details.timezone')} value={schedule.timezone} mono />
						<CronDetail label={t('settings.cron.details.visibility')} value={schedule.visibility} mono />
						<CronDetail
							label={t('settings.cron.details.createdAt')}
							value={formatTimestamp(schedule.createdAt)}
						/>
						<CronDetail
							label={t('settings.cron.details.updatedAt')}
							value={formatTimestamp(schedule.updatedAt)}
						/>
						<CronDetail
							label={t('settings.cron.details.lastRun')}
							value={formatTimestamp(schedule.lastRunAt)}
						/>
						<CronDetail
							label={t('settings.cron.details.nextRun')}
							value={formatTimestamp(schedule.nextRunAt)}
						/>
						<CronDetail label={t('settings.cron.details.source')} value={schedule.source} mono />
						<CronDetail label={t('settings.cron.details.runCount')} value={schedule.runCount} />
						<CronDetail label={t('settings.cron.details.failureCount')} value={schedule.failureCount ?? 0} />
					</dl>
				</SettingsPanel>
			</SettingsSection>

			{entries.length > 0 && (
				<SettingsSection title={t('settings.cron.details.payload')}>
					<SettingsPanel>
						<dl className="grid gap-2 px-3 py-2 sm:grid-cols-2">
							{entries.map(([key, value]) => (
								<CronDetail key={key} label={key} value={value} mono />
							))}
						</dl>
					</SettingsPanel>
				</SettingsSection>
			)}

			<div className="border-t border-border/60 pt-3">
				<Button
					type="button"
					size="lg"
					variant="destructive"
					className="w-full"
					disabled={busy}
					onClick={() => void deleteSchedule()}
					aria-label={t('settings.cron.actions.removeLabel', { id: schedule.name })}
				>
					{busyAction === 'delete' ? (
						<LoaderCircle className="size-3 animate-spin" />
					) : (
						<Trash2 className="size-3" />
					)}
					{busyAction === 'delete'
						? t('settings.cron.actions.removing')
						: t('settings.cron.actions.remove')}
				</Button>
			</div>
		</SettingsPageShell>
	);
};

export default CronDetailsPage;
