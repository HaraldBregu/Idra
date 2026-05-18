import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertCircle, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { FridayCronJob } from '../../../../../../../shared/cron';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import {
	deliverySummary,
	formatSchedule,
	formatTimestamp,
	isFridayCronJob,
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
	const { jobId } = useParams<{ jobId: string }>();
	const [job, setJob] = useState<FridayCronJob | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
			.action({ action: 'get', jobId })
			.then((response) => {
				if (!mounted) return;
				if (!isFridayCronJob(response.result)) {
					throw new Error(t('settings.cron.notFoundDescription'));
				}
				setJob(response.result);
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

			<SettingsSection title={t('settings.cron.details.prompt')}>
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
								{job.payload.kind}
							</Badge>
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								{job.schedule.kind}
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
						<CronDetail label={t('settings.cron.details.target')} value={job.sessionTarget} mono />
						<CronDetail label={t('settings.cron.details.delivery')} value={deliverySummary(job)} mono />
						<CronDetail
							label={t('settings.cron.details.createdAt')}
							value={formatTimestamp(job.createdAtMs)}
						/>
						<CronDetail
							label={t('settings.cron.details.updatedAt')}
							value={formatTimestamp(job.updatedAtMs)}
						/>
						<CronDetail
							label={t('settings.cron.details.lastRun')}
							value={formatTimestamp(job.state.lastRunAtMs)}
						/>
						<CronDetail
							label={t('settings.cron.details.nextRun')}
							value={formatTimestamp(job.state.nextRunAtMs)}
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
		</SettingsPageShell>
	);
};

export default CronDetailsPage;
