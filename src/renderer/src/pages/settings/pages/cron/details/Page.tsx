import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, LoaderCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CronSchedule } from '../../../../../../../shared/cron';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import {
	formatSchedule,
	formatTimestamp,
	payloadEntries,
	payloadSummary,
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

const CronDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { jobId } = useParams<{ jobId: string }>();
	const [job, setJob] = useState<CronSchedule | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [removing, setRemoving] = useState(false);

	useEffect(() => {
		let mounted = true;

		if (!jobId) {
			setLoading(false);
			setError(t('settings.cron.notFoundDescription'));
			return () => {
				mounted = false;
			};
		}

		setLoading(true);
		window.cron
			.getSchedule(jobId)
			.then((response) => {
				if (!mounted) return;
				setJob(response);
				setError(null);
			})
			.catch((caught) => {
				if (!mounted) return;
				setJob(null);
				setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, [jobId, t]);

	const handleRemoveJob = async (): Promise<void> => {
		if (!job) return;
		if (!window.confirm(t('settings.cron.actions.confirmRemove', { id: job.id }))) return;

		setRemoving(true);
		setError(null);
		try {
			await window.cron.deleteSchedule(job.id);
			navigate('/settings/cron');
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
			setRemoving(false);
		}
	};

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.cron.detailsTitle')} />
				<Card size="sm" className="gap-0! p-3!">
					<Skeleton className="h-5 w-56 max-w-full" />
					<Skeleton className="mt-3 h-16 w-full" />
				</Card>
			</SettingsPageShell>
		);
	}

	if (!job) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.cron.detailsTitle')} />
				<Card size="sm" className="gap-0! p-0!">
					<SettingsEmptyState
						icon={Clock3}
						title={t('settings.cron.notFoundTitle')}
						description={error ?? t('settings.cron.notFoundDescription')}
						className="min-h-28"
					/>
				</Card>
			</SettingsPageShell>
		);
	}

	const schedule = formatSchedule(job.schedule);
	const entries = payloadEntries(job.payload);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={job.name}
				description={job.description}
			/>

			{error && (
				<Card size="sm" className="gap-0! p-0!">
					<div className="flex min-w-0 items-start gap-2 px-3 py-2 text-destructive">
						<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
						<div className="min-w-0 text-xs leading-5">{error}</div>
					</div>
				</Card>
			)}

			<SettingsSection hideTitle title={t('settings.cron.details.prompt')}>
				<Card size="sm" className="gap-0! p-0!">
					<div className="px-3 py-2">
						<div className="mb-2 flex flex-wrap items-center gap-1.5">
							<Badge
								variant={job.enabled ? 'outline' : 'destructive'}
								className="h-4 px-1.5 text-[10px]"
							>
								{job.enabled ? t('settings.cron.enabled') : t('settings.cron.disabled')}
							</Badge>
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								{job.target}
							</Badge>
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								{job.type}
							</Badge>
						</div>
						<p className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
							{payloadSummary(job.payload)}
						</p>
					</div>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.cron.detailsTitle')}>
				<Card size="sm" className="gap-0! p-0!">
					<dl className="grid gap-2 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
						<CronDetail label={t('settings.cron.details.id')} value={job.id} mono />
						<CronDetail label={t('settings.cron.details.schedule')} value={schedule} mono />
						<CronDetail label={t('settings.cron.details.target')} value={job.target} mono />
						<CronDetail label="Task type" value={job.taskType} mono />
						<CronDetail
							label={t('settings.cron.details.createdAt')}
							value={formatTimestamp(job.createdAt)}
						/>
						<CronDetail
							label={t('settings.cron.details.updatedAt')}
							value={formatTimestamp(job.updatedAt)}
						/>
						<CronDetail
							label={t('settings.cron.details.lastRun')}
							value={formatTimestamp(job.lastRunAt)}
						/>
						<CronDetail
							label={t('settings.cron.details.nextRun')}
							value={formatTimestamp(job.nextRunAt)}
						/>
					</dl>
				</Card>
			</SettingsSection>

			{entries.length > 0 && (
				<SettingsSection title={t('settings.cron.details.payload')}>
					<Card size="sm" className="gap-0! p-0!">
						<dl className="grid gap-2 px-3 py-2 sm:grid-cols-2">
							{entries.map(([key, value]) => (
								<CronDetail key={key} label={key} value={value} mono />
							))}
						</dl>
					</Card>
				</SettingsSection>
			)}

			<div className="border-t border-border/60 pt-3">
				<Button
					type="button"
					size="lg"
					variant="destructive"
					className="w-full"
					disabled={removing}
					onClick={() => void handleRemoveJob()}
					aria-label={t('settings.cron.actions.removeLabel', { id: job.id })}
				>
					{removing ? (
						<LoaderCircle className="size-3 animate-spin" />
					) : (
						<Trash2 className="size-3" />
					)}
					{removing ? t('settings.cron.actions.removing') : t('settings.cron.actions.remove')}
				</Button>
			</div>
		</SettingsPageShell>
	);
};

export default CronDetailsPage;
