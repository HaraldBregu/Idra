import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock3, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { CronSchedule, CronScheduleCreateRequest } from '../../../../../../shared/cron';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsField,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
	SettingsEmptyState,
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

type ScheduleKind = 'cron' | 'every' | 'at';
type EveryUnit = 'minutes' | 'hours' | 'days';

const UNIT_MS: Record<EveryUnit, number> = {
	minutes: 60_000,
	hours: 3_600_000,
	days: 86_400_000,
};

function ScheduleTaskForm({
	onCreated,
	onCancel,
}: {
	readonly onCreated: () => void;
	readonly onCancel: () => void;
}): React.JSX.Element {
	const [name, setName] = useState('');
	const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('cron');
	const [cronExpr, setCronExpr] = useState('');
	const [everyAmount, setEveryAmount] = useState('');
	const [everyUnit, setEveryUnit] = useState<EveryUnit>('hours');
	const [atDateTime, setAtDateTime] = useState('');
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
			let request: CronScheduleCreateRequest;
			const taskInput = { message: message.trim() };
			const baseRequest = {
				name: name.trim(),
				source: 'ui' as const,
				createdBy: 'local',
				ownerUserId: 'local',
				timezone,
				taskType: 'agent.run',
				taskInput,
				target: 'agent' as const,
				payload: taskInput,
			};

			if (scheduleKind === 'cron') {
				if (!cronExpr.trim()) throw new Error('Cron expression is required.');
				const expression = cronExpr.trim();
				request = {
					...baseRequest,
					type: 'cron',
					cronExpression: expression,
					schedule: expression,
				};
			} else if (scheduleKind === 'every') {
				const n = Number(everyAmount);
				if (!everyAmount || !Number.isFinite(n) || n <= 0)
					throw new Error('Enter a valid positive interval.');
				const intervalMs = n * UNIT_MS[everyUnit];
				request = {
					...baseRequest,
					type: 'interval',
					intervalMs,
					schedule: { type: 'interval', intervalMs },
				};
			} else {
				if (!atDateTime) throw new Error('Date and time are required.');
				const runAt = new Date(atDateTime).toISOString();
				request = {
					...baseRequest,
					type: 'oneTime',
					runAt,
					schedule: { type: 'oneTime', runAt },
				};
			}

			await window.cron.createSchedule(request);

			setName('');
			setCronExpr('');
			setEveryAmount('');
			setAtDateTime('');
			setMessage('');
			onCreated();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSubmitting(false);
		}
	};

	const canSubmit = name.trim().length > 0 && message.trim().length > 0 && !submitting;

	return (
		<SettingsPanel>
			<form onSubmit={handleSubmit} className="grid gap-4 p-3">
				<SettingsField id="task-name" label="Name">
					<Input
						id="task-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Daily summary"
						required
						className="h-8 text-sm"
					/>
				</SettingsField>

				<SettingsField id="task-schedule-kind" label="Schedule type">
					<Select
						value={scheduleKind}
						onValueChange={(v) => setScheduleKind(v as ScheduleKind)}
					>
						<SelectTrigger id="task-schedule-kind" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="cron">Cron expression</SelectItem>
							<SelectItem value="every">Every interval</SelectItem>
							<SelectItem value="at">At specific time</SelectItem>
						</SelectContent>
					</Select>
				</SettingsField>

				{scheduleKind === 'cron' && (
					<SettingsField
						id="task-cron-expr"
						label="Expression"
						description="Standard cron syntax — e.g. 0 9 * * 1-5 for weekdays at 9 am."
					>
						<Input
							id="task-cron-expr"
							value={cronExpr}
							onChange={(e) => setCronExpr(e.target.value)}
							placeholder="0 9 * * 1-5"
							className="h-8 font-mono text-sm"
						/>
					</SettingsField>
				)}

				{scheduleKind === 'every' && (
					<SettingsField id="task-every-amount" label="Repeat every">
						<div className="flex gap-2">
							<Input
								id="task-every-amount"
								type="number"
								min="1"
								step="1"
								value={everyAmount}
								onChange={(e) => setEveryAmount(e.target.value)}
								placeholder="1"
								className="h-8 w-24 text-sm"
							/>
							<Select
								value={everyUnit}
								onValueChange={(v) => setEveryUnit(v as EveryUnit)}
							>
								<SelectTrigger className="flex-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="minutes">Minutes</SelectItem>
									<SelectItem value="hours">Hours</SelectItem>
									<SelectItem value="days">Days</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</SettingsField>
				)}

				{scheduleKind === 'at' && (
					<SettingsField id="task-at" label="Date and time">
						<Input
							id="task-at"
							type="datetime-local"
							value={atDateTime}
							onChange={(e) => setAtDateTime(e.target.value)}
							className="h-8 text-sm"
						/>
					</SettingsField>
				)}

				<SettingsField id="task-message" label="Prompt">
					<Textarea
						id="task-message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Summarize today's news and send it to me."
						rows={3}
						required
					/>
				</SettingsField>

				{error && (
					<div className="flex items-start gap-2 text-xs text-destructive">
						<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
						<span>{error}</span>
					</div>
				)}

				<div className="flex justify-end gap-2">
					<Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
						Cancel
					</Button>
					<Button type="submit" size="sm" disabled={!canSubmit}>
						<Plus className="size-3.5" />
						{submitting ? 'Scheduling…' : 'Schedule task'}
					</Button>
				</div>
			</form>
		</SettingsPanel>
	);
}

const CronPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [jobs, setJobs] = useState<readonly CronSchedule[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);

	const loadJobs = useCallback(() => {
		setLoading(true);
		window.cron
			.listSchedules({ includeDeleted: false })
			.then((nextJobs) => {
				setJobs(nextJobs);
				setError(null);
			})
			.catch((caught) => {
				setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	useEffect(() => {
		let mounted = true;

		setLoading(true);
		window.cron
			.listSchedules({ includeDeleted: false })
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

	const navigateToJob = (jobId: string): void => {
		navigate(`/settings/cron/crondetails/${encodeURIComponent(jobId)}`);
	};

	const handleCreated = (): void => {
		setShowForm(false);
		loadJobs();
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.taskScheduler')}
				action={
					!showForm && (
						<Button size="sm" onClick={() => setShowForm(true)}>
							<Plus className="size-3.5" />
							New schedule
						</Button>
					)
				}
			/>

			{showForm && (
				<SettingsSection title="New scheduled task">
					<ScheduleTaskForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
				</SettingsSection>
			)}

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
							const nextRun = formatTimestamp(job.nextRunAt);

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
