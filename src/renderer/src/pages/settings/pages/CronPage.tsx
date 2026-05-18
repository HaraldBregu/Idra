import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, Clock3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import type { OpenClawCronJob, OpenClawCronPayload, OpenClawCronSchedule } from '../../../../../shared/cron';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../components';

function formatTimestamp(value: number | string | undefined): string {
	if (value === undefined || value === '') return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString();
}

function formatDuration(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) return '—';
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

function formatDetailValue(value: unknown): string {
	if (value === undefined || value === null || value === '') return '—';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

function formatSchedule(schedule: OpenClawCronSchedule): string {
	switch (schedule.kind) {
		case 'at':
			return formatTimestamp(schedule.at);
		case 'every':
			return `Every ${formatDuration(schedule.everyMs)}`;
		case 'cron': {
			const timezone = schedule.tz ? ` ${schedule.tz}` : '';
			const stagger = schedule.staggerMs ? ` +${formatDuration(schedule.staggerMs)}` : '';
			return `${schedule.expr}${timezone}${stagger}`;
		}
	}
}

function payloadSummary(payload: OpenClawCronPayload): string {
	return payload.kind === 'systemEvent' ? payload.text : payload.message;
}

function deliverySummary(job: OpenClawCronJob): string {
	if (job.delivery.mode === 'none') return 'none';
	const target = [job.delivery.channel, job.delivery.to, job.delivery.threadId]
		.filter(Boolean)
		.join(' ');
	return target ? `${job.delivery.mode}: ${target}` : job.delivery.mode;
}

function payloadEntries(payload: OpenClawCronPayload): readonly (readonly [string, string])[] {
	return Object.entries(payload)
		.filter(([key]) => !['kind', 'message', 'text'].includes(key))
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

function CronLoadingList(): React.JSX.Element {
	return (
		<div className="grid gap-2">
			{[0, 1, 2].map((index) => (
				<SettingsPanel key={index}>
					<div className="flex items-center gap-2 px-3 py-2">
						<Skeleton className="size-6" />
						<div className="min-w-0 flex-1">
							<Skeleton className="h-4 w-48 max-w-full" />
							<Skeleton className="mt-2 h-3 w-72 max-w-full" />
						</div>
						<Skeleton className="size-6" />
					</div>
				</SettingsPanel>
			))}
		</div>
	);
}

const CronPage: React.FC = () => {
	const { t } = useTranslation();
	const [jobs, setJobs] = useState<readonly OpenClawCronJob[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

	useEffect(() => {
		let mounted = true;

		setLoading(true);
		window.cron
			.listJobs('all')
			.then((nextJobs) => {
				if (!mounted) return;
				setJobs(nextJobs);
				setError(null);
			})
			.catch((caught) => {
				if (mounted) setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const handleRemoveJob = async (jobId: string): Promise<void> => {
		setRemovingId(jobId);
		setError(null);
		try {
			await window.cron.removeJob(jobId);
			setJobs((current) => current.filter((job) => job.id !== jobId));
			setExpandedIds((current) => {
				const next = new Set(current);
				next.delete(jobId);
				return next;
			});
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setRemovingId(null);
		}
	};

	const setJobExpanded = (jobId: string, open: boolean): void => {
		setExpandedIds((current) => {
			const next = new Set(current);
			if (open) next.add(jobId);
			else next.delete(jobId);
			return next;
		});
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.cron')} />
			<SettingsSection title={t('settings.sections.cron')}>
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
				) : jobs.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Clock3}
							title={t('settings.cron.emptyTitle')}
							description={t('settings.cron.emptyDescription')}
							className="min-h-28"
						/>
					</SettingsPanel>
				) : (
					<div className="grid gap-2">
						{jobs.map((job) => {
							const schedule = formatSchedule(job.schedule);
							const summary = payloadSummary(job.payload);
							const entries = payloadEntries(job.payload);
							const isExpanded = expandedIds.has(job.id);

							return (
								<SettingsPanel key={job.id}>
									<Collapsible
										open={isExpanded}
										onOpenChange={(open) => setJobExpanded(job.id, open)}
									>
										<Item variant="outline" size="sm" className="items-start">
											<ItemMedia variant="icon">
												<Clock3 className="size-3" strokeWidth={1.8} />
											</ItemMedia>
											<ItemContent className="min-w-0 flex-1 items-start">
												<div className="min-w-0 flex-1">
													<ItemTitle className="w-full max-w-full truncate">{job.name}</ItemTitle>
													<p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
														{summary}
													</p>
													<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
														<Badge variant="outline" className="h-4 max-w-full px-1.5 font-mono text-[10px]">
															<span className="truncate">{schedule}</span>
														</Badge>
													</div>
												</div>
											</ItemContent>
											<ItemActions className="flex-none justify-end gap-1">
												<CollapsibleTrigger
													className="inline-flex size-6 items-center justify-center rounded-[min(var(--radius-md),10px)] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
													aria-label={t(
														isExpanded
															? 'settings.cron.actions.collapseLabel'
															: 'settings.cron.actions.expandLabel',
														{ id: job.id }
													)}
													title={t(isExpanded ? 'settings.cron.actions.collapse' : 'settings.cron.actions.expand')}
												>
													<ChevronDown
														className={cn(
															'size-3 transition-transform',
															isExpanded && 'rotate-180'
														)}
													/>
												</CollapsibleTrigger>
												<Button
													type="button"
													variant="destructive"
													size="icon-xs"
													disabled={removingId === job.id}
													onClick={() => void handleRemoveJob(job.id)}
													aria-label={t('settings.cron.actions.removeLabel', { id: job.id })}
													title={t('settings.cron.actions.remove')}
												>
													<Trash2 className="size-3" />
												</Button>
											</ItemActions>
										</Item>

										<CollapsibleContent>
											<dl className="grid gap-2 border-t border-border/70 bg-muted/10 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
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

											{entries.length > 0 && (
												<div className="border-t border-border/70 px-3 py-2">
													<div className="text-[11px] font-medium text-muted-foreground">
														{t('settings.cron.details.payload')}
													</div>
													<dl className="mt-1.5 grid gap-2 sm:grid-cols-2">
														{entries.map(([key, value]) => (
															<CronDetail key={key} label={key} value={value} mono />
														))}
													</dl>
												</div>
											)}
										</CollapsibleContent>
									</Collapsible>
								</SettingsPanel>
							);
						})}
					</div>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default CronPage;
