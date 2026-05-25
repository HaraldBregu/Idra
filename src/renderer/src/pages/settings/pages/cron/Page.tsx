import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, Clock3, LoaderCircle, Plus, Save } from 'lucide-react';
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
import type { FridayCronJob, FridayCronSchedule } from '../../../../../../shared/cron';
import type { Model } from '../../../../../../shared/agents/service';
import type { PublicProvider } from '../../../../../../shared/providers';
import { Item, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

function mergeModels(models: readonly Model[], selectedModel?: Model): Model[] {
	const byId = new Map(models.map((model) => [model.id, model]));
	if (selectedModel && !byId.has(selectedModel.id)) byId.set(selectedModel.id, selectedModel);
	return [...byId.values()];
}

function CronAgentRuntimeSettings(): React.JSX.Element {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [models, setModels] = useState<Model[]>([]);
	const [providerId, setProviderId] = useState('');
	const [modelId, setModelId] = useState('');
	const [loading, setLoading] = useState(true);
	const [loadingModels, setLoadingModels] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [runtimeError, setRuntimeError] = useState<string | null>(null);

	const selectedProvider = providers.find((provider) => provider.id === providerId);
	const selectedModel = models.find((model) => model.id === modelId);

	useEffect(() => {
		let mounted = true;

		async function loadRuntimeSettings(): Promise<void> {
			setLoading(true);
			setRuntimeError(null);
			try {
				const [nextProviders, currentAgentService] = await Promise.all([
					window.app.getProviders(),
					window.app.getAgentService(),
				]);
				if (!mounted) return;

				const providerList =
					currentAgentService?.provider &&
					!nextProviders.some((provider) => provider.id === currentAgentService.provider.id)
						? [...nextProviders, currentAgentService.provider]
						: nextProviders;
				const nextProvider =
					providerList.find((provider) => provider.id === currentAgentService?.provider.id) ??
					providerList[0];

				setProviders(providerList);
				setProviderId(nextProvider?.id ?? '');
				if (!nextProvider) {
					setModels([]);
					setModelId('');
					return;
				}

				const loadedModels = await window.app.getModels(nextProvider);
				if (!mounted) return;
				const nextModels =
					currentAgentService?.provider.id === nextProvider.id
						? mergeModels(loadedModels, currentAgentService.model)
						: loadedModels;
				setModels(nextModels);
				setModelId(
					currentAgentService?.provider.id === nextProvider.id
						? currentAgentService.model.id
						: (nextModels[0]?.id ?? '')
				);
			} catch (caught) {
				if (mounted) setRuntimeError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void loadRuntimeSettings();

		return () => {
			mounted = false;
		};
	}, []);

	const handleProviderChange = (nextProviderId: string | null): void => {
		const nextId = nextProviderId ?? '';
		if (nextId === providerId) return;
		const nextProvider = providers.find((provider) => provider.id === nextId);
		setProviderId(nextId);
		setModelId('');
		setModels([]);
		setSaved(false);
		setRuntimeError(null);
		if (!nextProvider) return;

		setLoadingModels(true);
		void window.app
			.getModels(nextProvider)
			.then((nextModels) => {
				setModels(nextModels);
				setModelId(nextModels[0]?.id ?? '');
			})
			.catch((caught) => {
				setRuntimeError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				setLoadingModels(false);
			});
	};

	const handleSave = async (): Promise<void> => {
		if (!selectedProvider || !selectedModel) return;
		setSaving(true);
		setSaved(false);
		setRuntimeError(null);
		try {
			const didSave = await window.app.saveAgentService(selectedProvider, selectedModel);
			if (!didSave) throw new Error(t('settings.cron.runtime.errors.saveFailed'));
			setSaved(true);
		} catch (caught) {
			setRuntimeError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsSection
			title={t('settings.cron.runtime.title')}
			description={t('settings.cron.runtime.description')}
		>
			<SettingsPanel>
				<div className="grid gap-3 px-3 py-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<SettingsField id="cron-runtime-provider" label={t('settings.cron.runtime.provider')}>
							<Select
								value={providerId}
								onValueChange={handleProviderChange}
								disabled={loading || providers.length === 0 || saving}
							>
								<SelectTrigger id="cron-runtime-provider" className="w-full text-xs">
									<SelectValue placeholder={t('settings.cron.runtime.providerPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									{providers.map((provider) => (
										<SelectItem key={provider.id} value={provider.id}>
											{provider.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SettingsField>

						<SettingsField id="cron-runtime-model" label={t('settings.cron.runtime.model')}>
							<Select
								value={modelId}
								onValueChange={(nextModelId) => {
									const nextId = nextModelId ?? '';
									if (nextId === modelId) return;
									setModelId(nextId);
									setSaved(false);
								}}
								disabled={loading || loadingModels || !selectedProvider || models.length === 0 || saving}
							>
								<SelectTrigger id="cron-runtime-model" className="w-full text-xs">
									<SelectValue
										placeholder={
											loadingModels
												? t('settings.cron.runtime.modelsLoading')
												: t('settings.cron.runtime.modelPlaceholder')
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{models.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.name || model.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SettingsField>
					</div>

					{providers.length === 0 && !loading && (
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.cron.runtime.noProviders')}
						</p>
					)}
					{selectedProvider && models.length === 0 && !loading && !loadingModels && (
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.cron.runtime.noModels')}
						</p>
					)}
					{runtimeError && (
						<div className="flex min-w-0 items-start gap-2 text-destructive">
							<AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
							<div className="min-w-0 text-xs leading-5">{runtimeError}</div>
						</div>
					)}
					{saved && (
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.cron.runtime.saved')}
						</p>
					)}

					<div className="flex justify-end">
						<Button
							type="button"
							size="sm"
							disabled={loading || loadingModels || saving || !selectedProvider || !selectedModel}
							onClick={() => void handleSave()}
						>
							{saving ? <LoaderCircle className="size-3 animate-spin" /> : <Save className="size-3" />}
							{saving ? t('settings.cron.runtime.saving') : t('settings.cron.runtime.save')}
						</Button>
					</div>
				</div>
			</SettingsPanel>
		</SettingsSection>
	);
}

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
			let schedule: FridayCronSchedule;

			if (scheduleKind === 'cron') {
				if (!cronExpr.trim()) throw new Error('Cron expression is required.');
				schedule = { kind: 'cron', expr: cronExpr.trim() };
			} else if (scheduleKind === 'every') {
				const n = Number(everyAmount);
				if (!everyAmount || !Number.isFinite(n) || n <= 0)
					throw new Error('Enter a valid positive interval.');
				schedule = { kind: 'every', everyMs: n * UNIT_MS[everyUnit] };
			} else {
				if (!atDateTime) throw new Error('Date and time are required.');
				schedule = { kind: 'at', at: new Date(atDateTime).toISOString() };
			}

			await window.cron.action({
				action: 'add',
				job: {
					name: name.trim(),
					schedule,
					payload: { kind: 'agentTurn', message: message.trim() },
				},
			});

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
	const [jobs, setJobs] = useState<readonly FridayCronJob[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);

	const loadJobs = useCallback(() => {
		setLoading(true);
		window.cron
			.listJobs('all')
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

			<CronAgentRuntimeSettings />

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
