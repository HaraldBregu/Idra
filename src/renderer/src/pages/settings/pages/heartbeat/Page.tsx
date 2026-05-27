import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Activity,
	AlertTriangle,
	BellOff,
	RefreshCw,
	Send,
	TimerReset,
	Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type {
	HeartbeatEventPayload,
	HeartbeatEventStatus,
	HeartbeatStatus,
	HeartbeatTimingSettings,
} from '../../../../../../shared/heartbeat';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

type Operation = 'refresh' | 'toggle' | 'timing' | 'wake' | 'event-now' | 'event-next' | null;

interface TimingDraft {
	every: string;
	start: string;
	end: string;
	timezone: string;
}

const TIMING_PRESETS = ['5m', '15m', '30m', '1h', '0m'] as const;
const DURATION_TOKEN_RE = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/gi;
const UNIT_MS: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 60 * 60_000,
	d: 24 * 60 * 60_000,
};

function timingToDraft(timing: HeartbeatTimingSettings): TimingDraft {
	return {
		every: timing.every,
		start: timing.activeHours?.start ?? '',
		end: timing.activeHours?.end ?? '',
		timezone: timing.activeHours?.timezone ?? '',
	};
}

function parseDurationMs(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
		const value = Number(trimmed) * UNIT_MS.m;
		return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
	}

	let total = 0;
	let consumed = '';
	for (const match of trimmed.matchAll(DURATION_TOKEN_RE)) {
		const value = Number(match[1]);
		const unit = match[2]?.toLowerCase() ?? 'm';
		const unitMs = UNIT_MS[unit];
		if (!Number.isFinite(value) || !unitMs) return null;
		total += value * unitMs;
		consumed += match[0];
	}

	if (consumed.replace(/\s+/g, '') !== trimmed.replace(/\s+/g, '')) return null;
	return Number.isFinite(total) && total > 0 ? Math.floor(total) : null;
}

function isDisabledDuration(raw: string): boolean {
	return /^0+(?:\.0+)?\s*(ms|s|m|h|d)?$/i.test(raw.trim());
}

function isValidEvery(raw: string): boolean {
	return parseDurationMs(raw) !== null || isDisabledDuration(raw);
}

function formatTimestamp(value?: number): string | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}

function formatDuration(durationMs?: number): string | null {
	if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) return null;
	if (durationMs < 1000) return `${Math.max(0, Math.round(durationMs))} ms`;
	return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 1 : 0)} s`;
}

function statusVariant(status: HeartbeatEventStatus): React.ComponentProps<typeof Badge>['variant'] {
	switch (status) {
		case 'failed':
			return 'destructive';
		case 'sent':
			return 'default';
		case 'ok-empty':
		case 'ok-token':
			return 'outline';
		case 'skipped':
			return 'secondary';
	}
}

const HeartbeatPage: React.FC = () => {
	const { t } = useTranslation();
	const [status, setStatus] = useState<HeartbeatStatus | null>(null);
	const [lastHeartbeat, setLastHeartbeat] = useState<HeartbeatEventPayload | null>(null);
	const [timing, setTiming] = useState<HeartbeatTimingSettings | null>(null);
	const [timingDraft, setTimingDraft] = useState<TimingDraft>({
		every: '30m',
		start: '',
		end: '',
		timezone: '',
	});
	const [loading, setLoading] = useState(true);
	const [operation, setOperation] = useState<Operation>(null);
	const [eventText, setEventText] = useState('');
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const applyStatus = useCallback((nextStatus: HeartbeatStatus): void => {
		setStatus(nextStatus);
		setLastHeartbeat(nextStatus.lastHeartbeat);
	}, []);

	const applyTiming = useCallback((nextTiming: HeartbeatTimingSettings): void => {
		setTiming(nextTiming);
		setTimingDraft(timingToDraft(nextTiming));
	}, []);

	const loadHeartbeat = useCallback(
		async (showLoading = false): Promise<void> => {
			if (showLoading) setLoading(true);
			setError(null);
			try {
				const [nextStatus, nextTiming] = await Promise.all([
					window.heartbeat.status(),
					window.heartbeat.getTiming(),
				]);
				applyStatus(nextStatus);
				applyTiming(nextTiming);
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				if (showLoading) setLoading(false);
			}
		},
		[applyStatus, applyTiming]
	);

	useEffect(() => {
		void loadHeartbeat(true);

		const unsubscribe = window.heartbeat.onEvent((event) => {
			setLastHeartbeat(event);
			setStatus((current) => current ? { ...current, lastHeartbeat: event } : current);
		});

		return unsubscribe;
	}, [loadHeartbeat]);

	const handleRefresh = useCallback(async (): Promise<void> => {
		setOperation('refresh');
		setNotice(null);
		try {
			await loadHeartbeat();
		} finally {
			setOperation(null);
		}
	}, [loadHeartbeat]);

	const handleToggle = useCallback(
		async (enabled: boolean): Promise<void> => {
			setOperation('toggle');
			setNotice(null);
			setError(null);
			try {
				applyStatus(await window.heartbeat.setEnabled({ enabled }));
				setNotice(t(enabled ? 'settings.heartbeat.notices.enabled' : 'settings.heartbeat.notices.disabled'));
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				setOperation(null);
			}
		},
		[applyStatus, t]
	);

	const handleWakeNow = useCallback(async (): Promise<void> => {
		setOperation('wake');
		setNotice(null);
		setError(null);
		try {
			await window.heartbeat.request({
				source: 'manual',
				intent: 'manual',
				reason: 'settings page manual wake',
			});
			setNotice(t('settings.heartbeat.notices.wakeQueued'));
			await loadHeartbeat();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setOperation(null);
		}
	}, [loadHeartbeat, t]);

	const handleSystemEvent = useCallback(
		async (mode: 'now' | 'next-heartbeat'): Promise<void> => {
			const text = eventText.trim();
			if (!text) {
				setNotice(null);
				setError(t('settings.heartbeat.errors.emptyEvent'));
				return;
			}

			setOperation(mode === 'now' ? 'event-now' : 'event-next');
			setNotice(null);
			setError(null);
			try {
				const result = await window.heartbeat.systemEvent({ text, mode });
				setEventText('');
				setNotice(t('settings.heartbeat.notices.eventQueued', { session: result.sessionKey }));
				await loadHeartbeat();
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				setOperation(null);
			}
		},
		[eventText, loadHeartbeat, t]
	);

	const handleSaveTiming = useCallback(async (): Promise<void> => {
		const every = timingDraft.every.trim();
		const start = timingDraft.start.trim();
		const end = timingDraft.end.trim();
		const timezone = timingDraft.timezone.trim();
		if (!every || !isValidEvery(every)) {
			setNotice(null);
			setError(t('settings.heartbeat.errors.invalidEvery'));
			return;
		}
		if ((start && !end) || (!start && end)) {
			setNotice(null);
			setError(t('settings.heartbeat.errors.activeHoursRange'));
			return;
		}

		setOperation('timing');
		setNotice(null);
		setError(null);
		try {
			const nextTiming = await window.heartbeat.updateTiming({
				every,
				activeHours: start || end || timezone
					? {
							...(start ? { start } : {}),
							...(end ? { end } : {}),
							...(timezone ? { timezone } : {}),
					  }
					: undefined,
			});
			applyTiming(nextTiming);
			setNotice(t('settings.heartbeat.notices.timingSaved'));
			await loadHeartbeat();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setOperation(null);
		}
	}, [applyTiming, loadHeartbeat, t, timingDraft]);

	const runtimeEnabled = Boolean(status?.enabled);
	const isBusy = operation !== null;
	const nextDue = formatTimestamp(status?.nextDueMs);
	const lastTimestamp = formatTimestamp(lastHeartbeat?.timestamp);
	const lastDuration = formatDuration(lastHeartbeat?.durationMs);
	const lastDescription =
		lastHeartbeat?.preview ??
		lastHeartbeat?.reason ??
		lastTimestamp ??
		t('settings.heartbeat.values.unknown');
	const timingDirty = timing
		? timingDraft.every.trim() !== timing.every ||
			timingDraft.start.trim() !== (timing.activeHours?.start ?? '') ||
			timingDraft.end.trim() !== (timing.activeHours?.end ?? '') ||
			timingDraft.timezone.trim() !== (timing.activeHours?.timezone ?? '')
		: false;
	const timingValid = isValidEvery(timingDraft.every) &&
		((timingDraft.start.trim() && timingDraft.end.trim()) ||
			(!timingDraft.start.trim() && !timingDraft.end.trim()));

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.heartbeat')}
				description={t('settings.heartbeat.description')}
				icon={Activity}
				action={
					<Button
						type="button"
						variant="outline"
						size="xs"
						onClick={handleRefresh}
						disabled={loading || isBusy}
						aria-label={t('settings.heartbeat.actions.refresh')}
					>
						<RefreshCw className="size-3" />
						{t('settings.heartbeat.actions.refresh')}
					</Button>
				}
			/>

			{error && (
				<SettingsNotice icon={AlertTriangle} variant="destructive">
					{error}
				</SettingsNotice>
			)}
			{notice && !error && (
				<SettingsNotice icon={Activity}>
					{notice}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.heartbeat.runtime.title')}
			>
				<SettingsPanel>
					{loading && !status ? (
						<SettingsLoadingRows rows={2} />
					) : (
						<>
							<Item
								variant="outline"
								size="md"
								className="border-b border-border/60 px-3 py-2 last:border-b-0"
							>
								<ItemMedia variant="icon" className="size-6">
									<Power className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="max-w-full truncate">
										{t('settings.heartbeat.runtime.enabled')}
									</ItemTitle>
									<p className="mt-0.5 max-w-full truncate text-[11px] leading-4 text-muted-foreground">
										{t('settings.heartbeat.runtime.enabledDescription')}
									</p>
								</ItemContent>
								<ItemActions className="w-full min-w-0 flex-none flex-wrap justify-start gap-1.5 sm:w-auto sm:justify-end">
									<Badge
										variant={runtimeEnabled ? 'outline' : 'secondary'}
										className="h-5 rounded-md px-1.5 text-[10px]"
									>
										{runtimeEnabled
											? t('settings.heartbeat.values.enabled')
											: t('settings.heartbeat.values.paused')}
									</Badge>
									<Switch
										checked={runtimeEnabled}
										disabled={loading || isBusy}
										onCheckedChange={handleToggle}
										aria-label={t('settings.heartbeat.runtime.toggleLabel')}
									/>
								</ItemActions>
							</Item>
							<Item
								variant="outline"
								size="md"
								className="border-b border-border/60 px-3 py-2 last:border-b-0"
							>
								<ItemMedia variant="icon" className="size-6">
									<TimerReset className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="max-w-full truncate">
										{t('settings.heartbeat.runtime.nextDue')}
									</ItemTitle>
									<p className="mt-0.5 max-w-full truncate text-[11px] leading-4 text-muted-foreground">
										{t('settings.heartbeat.runtime.nextDueDescription')}
									</p>
								</ItemContent>
								<ItemActions className="w-full min-w-0 flex-none flex-wrap justify-start gap-1.5 sm:w-auto sm:justify-end">
									<Badge
										variant={status?.runnerActive ? 'outline' : 'secondary'}
										className="h-5 rounded-md px-1.5 text-[10px]"
									>
										{status?.runnerActive
											? t('settings.heartbeat.values.active')
											: t('settings.heartbeat.values.idle')}
									</Badge>
									<Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
										{t('settings.heartbeat.runtime.agentCount', { count: status?.agentCount ?? 0 })}
									</Badge>
									<Badge variant="outline" className="h-5 max-w-full rounded-md px-1.5 text-[10px]">
										<span className="truncate">
											{nextDue ?? t('settings.heartbeat.values.notScheduled')}
										</span>
									</Badge>
								</ItemActions>
							</Item>
						</>
					)}
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.heartbeat.timing.title')}
			>
				<SettingsPanel>
					{loading && !timing ? (
						<SettingsLoadingRows rows={2} />
					) : (
						<>
							<Item
								variant="outline"
								size="md"
								className="border-b border-border/60 px-3 py-2 last:border-b-0"
							>
								<ItemMedia variant="icon" className="size-6">
									<Clock3 className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="max-w-full truncate">
										{t('settings.heartbeat.timing.every')}
									</ItemTitle>
									<p className="mt-0.5 max-w-full truncate text-[11px] leading-4 text-muted-foreground">
										{t('settings.heartbeat.timing.everyDescription')}
									</p>
								</ItemContent>
								<ItemActions className="w-full min-w-0 flex-none flex-wrap justify-start gap-1.5 sm:w-[520px] sm:justify-end">
									<div className="grid w-full gap-1.5">
										<Input
											id="heartbeat-every"
											value={timingDraft.every}
											onChange={(event) =>
												setTimingDraft((current) => ({ ...current, every: event.target.value }))
											}
											disabled={loading || isBusy}
											placeholder={t('settings.heartbeat.timing.everyPlaceholder')}
											className="h-7 font-mono text-xs md:text-xs"
											aria-label={t('settings.heartbeat.timing.every')}
											aria-invalid={!isValidEvery(timingDraft.every)}
										/>
										<div className="flex flex-wrap items-center gap-1.5">
											{TIMING_PRESETS.map((preset) => (
												<Button
													key={preset}
													type="button"
													variant={timingDraft.every.trim() === preset ? 'secondary' : 'outline'}
													size="xs"
													onClick={() => setTimingDraft((current) => ({ ...current, every: preset }))}
													disabled={loading || isBusy}
												>
													{preset === '0m'
														? t('settings.heartbeat.timing.disablePreset')
														: preset}
												</Button>
											))}
										</div>
									</div>
								</ItemActions>
							</Item>
							<Item
								variant="outline"
								size="md"
								className="border-b border-border/60 px-3 py-2 last:border-b-0"
							>
								<ItemMedia variant="icon" className="size-6">
									<TimerReset className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="max-w-full truncate">
										{t('settings.heartbeat.timing.activeHours')}
									</ItemTitle>
									<p className="mt-0.5 max-w-full truncate text-[11px] leading-4 text-muted-foreground">
										{t('settings.heartbeat.timing.activeHoursDescription')}
									</p>
								</ItemContent>
								<ItemActions className="w-full min-w-0 flex-none flex-wrap justify-start gap-1.5 sm:w-[620px] sm:justify-end">
									<div className="grid w-full gap-2">
										<div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)]">
											<Input
												id="heartbeat-active-start"
												type="time"
												value={timingDraft.start}
												onChange={(event) =>
													setTimingDraft((current) => ({ ...current, start: event.target.value }))
												}
												disabled={loading || isBusy}
												className="h-7 text-xs md:text-xs"
												aria-label={t('settings.heartbeat.timing.activeStart')}
											/>
											<Input
												id="heartbeat-active-end"
												type="time"
												value={timingDraft.end}
												onChange={(event) =>
													setTimingDraft((current) => ({ ...current, end: event.target.value }))
												}
												disabled={loading || isBusy}
												className="h-7 text-xs md:text-xs"
												aria-label={t('settings.heartbeat.timing.activeEnd')}
											/>
											<Input
												id="heartbeat-active-timezone"
												value={timingDraft.timezone}
												onChange={(event) =>
													setTimingDraft((current) => ({ ...current, timezone: event.target.value }))
												}
												disabled={loading || isBusy}
												placeholder={t('settings.heartbeat.timing.timezonePlaceholder')}
												className="h-7 font-mono text-xs md:text-xs"
												aria-label={t('settings.heartbeat.timing.timezone')}
											/>
										</div>
										<div className="flex justify-end">
											<Button
												type="button"
												size="xs"
												onClick={handleSaveTiming}
												disabled={loading || isBusy || !timingDirty || !timingValid}
											>
												<TimerReset className="size-3" />
												{t('settings.heartbeat.actions.saveTiming')}
											</Button>
										</div>
									</div>
								</ItemActions>
							</Item>
						</>
					)}
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.heartbeat.last.title')}
			>
				<SettingsPanel>
					{loading && !lastHeartbeat ? (
						<SettingsLoadingRows rows={1} />
					) : !lastHeartbeat ? (
						<SettingsEmptyState
							icon={BellOff}
							title={t('settings.heartbeat.last.emptyTitle')}
							description={t('settings.heartbeat.last.emptyDescription')}
						/>
					) : (
						<Item
							variant="outline"
							size="md"
							className="border-b border-border/60 px-3 py-2 last:border-b-0"
						>
							<ItemMedia variant="icon" className="size-6">
								<Activity className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
								<ItemTitle className="max-w-full truncate">
									{t('settings.heartbeat.last.latest')}
								</ItemTitle>
								<p className="mt-0.5 max-w-full truncate text-[11px] leading-4 text-muted-foreground">
									{lastDescription}
								</p>
							</ItemContent>
							<ItemActions className="w-full min-w-0 flex-none flex-wrap justify-start gap-1.5 sm:w-auto sm:justify-end">
								<Badge
									variant={statusVariant(lastHeartbeat.status)}
									className="h-5 rounded-md px-1.5 text-[10px]"
								>
									{t(`settings.heartbeat.status.${lastHeartbeat.status}`)}
								</Badge>
								{lastTimestamp && (
									<Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
										{lastTimestamp}
									</Badge>
								)}
								{lastDuration && (
									<Badge variant="outline" className="h-5 rounded-md px-1.5 font-mono text-[10px]">
										{lastDuration}
									</Badge>
								)}
								<Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
									{lastHeartbeat.channel ?? t('settings.heartbeat.values.noChannel')}
								</Badge>
							</ItemActions>
						</Item>
					)}
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.heartbeat.controls.title')}
			>
				<SettingsPanel>
					<Item
						variant="outline"
						size="md"
						className="border-b border-border/60 px-3 py-2 last:border-b-0"
					>
						<ItemMedia variant="icon" className="size-6">
							<Zap className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle className="max-w-full truncate">
								{t('settings.heartbeat.controls.wakeNow')}
							</ItemTitle>
							<p className="mt-0.5 max-w-full truncate text-[11px] leading-4 text-muted-foreground">
								{t('settings.heartbeat.controls.wakeNowDescription')}
							</p>
						</ItemContent>
						<ItemActions className="w-full min-w-0 flex-none flex-wrap justify-start gap-1.5 sm:w-auto sm:justify-end">
							<Button
								type="button"
								variant="outline"
								size="xs"
								onClick={handleWakeNow}
								disabled={loading || isBusy}
							>
								<Zap className="size-3" />
								{t('settings.heartbeat.actions.wakeNow')}
							</Button>
						</ItemActions>
					</Item>
					<Item
						variant="outline"
						size="md"
						className="border-b border-border/60 px-3 py-2 last:border-b-0"
					>
						<ItemMedia variant="icon" className="size-6">
							<Send className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle className="max-w-full truncate">
								{t('settings.heartbeat.controls.systemEvent')}
							</ItemTitle>
							<p className="mt-0.5 max-w-full truncate text-[11px] leading-4 text-muted-foreground">
								{t('settings.heartbeat.controls.systemEventDescription')}
							</p>
						</ItemContent>
						<ItemActions className="w-full min-w-0 flex-none flex-wrap justify-start gap-1.5 sm:w-[520px] sm:justify-end">
							<div className="grid w-full gap-1.5">
								<Textarea
									id="heartbeat-system-event"
									value={eventText}
									onChange={(event) => setEventText(event.target.value)}
									disabled={loading || isBusy}
									placeholder={t('settings.heartbeat.controls.systemEventPlaceholder')}
									className="min-h-16 resize-y text-xs leading-5 md:text-xs"
									aria-label={t('settings.heartbeat.controls.systemEvent')}
								/>
								<div className="flex flex-wrap items-center justify-end gap-1.5">
									<Button
										type="button"
										size="xs"
										onClick={() => handleSystemEvent('now')}
										disabled={loading || isBusy || eventText.trim().length === 0}
									>
										<Send className="size-3" />
										{t('settings.heartbeat.actions.sendNow')}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="xs"
										onClick={() => handleSystemEvent('next-heartbeat')}
										disabled={loading || isBusy || eventText.trim().length === 0}
									>
										<TimerReset className="size-3" />
										{t('settings.heartbeat.actions.sendNext')}
									</Button>
								</div>
							</div>
						</ItemActions>
					</Item>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default HeartbeatPage;
