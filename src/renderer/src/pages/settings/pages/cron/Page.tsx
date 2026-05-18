import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { OpenClawCronJob } from '../../../../../../shared/cron';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { formatSchedule, formatTimestamp } from './utils';

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
	const navigate = useNavigate();
	const [jobs, setJobs] = useState<readonly OpenClawCronJob[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [removingId, setRemovingId] = useState<string | null>(null);

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
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setRemovingId(null);
		}
	};

	const navigateToJob = (jobId: string): void => {
		navigate(`/settings/cron/crondetails/${encodeURIComponent(jobId)}`);
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
							const nextRun = formatTimestamp(job.state.nextRunAtMs);

							return (
								<div
									key={job.id}
									role="button"
									tabIndex={0}
									onClick={() => navigateToJob(job.id)}
									onKeyDown={(event) => {
										if (event.key !== 'Enter' && event.key !== ' ') return;
										event.preventDefault();
										navigateToJob(job.id);
									}}
									className="cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<SettingsPanel>
										<Item variant="outline" size="md" className="items-start">
											<ItemMedia variant="icon">
												<Clock3 className="size-3" strokeWidth={1.8} />
											</ItemMedia>
											<ItemContent className="min-w-0 flex-1 items-start">
												<div className="min-w-0 flex-1">
													<ItemTitle className="w-full max-w-full truncate">{job.name}</ItemTitle>
													<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
														<Badge
															variant={job.enabled ? 'outline' : 'destructive'}
															className="h-4 px-1.5 text-[10px]"
														>
															{job.enabled ? t('settings.cron.enabled') : t('settings.cron.disabled')}
														</Badge>
														<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
															Next: {nextRun}
														</Badge>
														<Badge variant="outline" className="h-4 max-w-full px-1.5 font-mono text-[10px]">
															<span className="truncate">{schedule}</span>
														</Badge>
													</div>
												</div>
											</ItemContent>
											<ItemActions className="flex-none justify-end gap-1">
												<Button
													type="button"
													variant="destructive"
													size="icon-xs"
													disabled={removingId === job.id}
													onKeyDown={(event) => event.stopPropagation()}
													onClick={(event) => {
														event.stopPropagation();
														void handleRemoveJob(job.id);
													}}
													aria-label={t('settings.cron.actions.removeLabel', { id: job.id })}
													title={t('settings.cron.actions.remove')}
												>
													<Trash2 className="size-3" />
												</Button>
											</ItemActions>
										</Item>
									</SettingsPanel>
								</div>
							);
						})}
					</div>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default CronPage;
