import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Activity,
	AlertTriangle,
	BellOff,
	Clock3,
	Power,
	RadioTower,
	RefreshCw,
	Send,
	TimerReset,
	Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type {
	HeartbeatEventPayload,
	HeartbeatEventStatus,
	HeartbeatStatus,
} from '../../../../../../shared/heartbeat';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from '../../components';

type Operation = 'refresh' | 'toggle' | 'wake' | 'event-now' | 'event-next' | null;

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
	const [loading, setLoading] = useState(true);
	const [operation, setOperation] = useState<Operation>(null);
	const [eventText, setEventText] = useState('');
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const applyStatus = useCallback((nextStatus: HeartbeatStatus): void => {
		setStatus(nextStatus);
		setLastHeartbeat(nextStatus.lastHeartbeat);
	}, []);

	const loadStatus = useCallback(
		async (showLoading = false): Promise<void> => {
			if (showLoading) setLoading(true);
			setError(null);
			try {
				applyStatus(await window.heartbeat.status());
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				if (showLoading) setLoading(false);
			}
		},
		[applyStatus]
	);

	useEffect(() => {
		let mounted = true;

		const loadInitialStatus = async (): Promise<void> => {
			try {
				const nextStatus = await window.heartbeat.status();
				if (!mounted) return;
				applyStatus(nextStatus);
				setError(null);
			} catch (caught) {
				if (mounted) setError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				if (mounted) setLoading(false);
			}
		};

		void loadInitialStatus();
		const unsubscribe = window.heartbeat.onEvent((event) => {
			setLastHeartbeat(event);
			setStatus((current) => current ? { ...current, lastHeartbeat: event } : current);
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, [applyStatus]);

	const handleRefresh = useCallback(async (): Promise<void> => {
		setOperation('refresh');
		setNotice(null);
		try {
			await loadStatus();
		} finally {
			setOperation(null);
		}
	}, [loadStatus]);

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
			await loadStatus();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setOperation(null);
		}
	}, [loadStatus, t]);

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
				await loadStatus();
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			} finally {
				setOperation(null);
			}
		},
		[eventText, loadStatus, t]
	);

	const runtimeEnabled = Boolean(status?.enabled);
	const isBusy = operation !== null;
	const nextDue = formatTimestamp(status?.nextDueMs);
	const lastTimestamp = formatTimestamp(lastHeartbeat?.timestamp);
	const lastDuration = formatDuration(lastHeartbeat?.durationMs);

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
				description={t('settings.heartbeat.runtime.description')}
			>
				<SettingsPanel>
					{loading && !status ? (
						<SettingsLoadingRows rows={4} />
					) : (
						<>
							<SettingsRow
								icon={Power}
								title={t('settings.heartbeat.runtime.enabled')}
								description={t('settings.heartbeat.runtime.enabledDescription')}
								actions={
									<>
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
									</>
								}
							/>
							<SettingsRow
								icon={Activity}
								title={t('settings.heartbeat.runtime.runner')}
								description={t('settings.heartbeat.runtime.runnerDescription')}
								actions={
									<Badge
										variant={status?.runnerActive ? 'outline' : 'secondary'}
										className="h-5 rounded-md px-1.5 text-[10px]"
									>
										{status?.runnerActive
											? t('settings.heartbeat.values.active')
											: t('settings.heartbeat.values.idle')}
									</Badge>
								}
							/>
							<SettingsRow
								icon={RadioTower}
								title={t('settings.heartbeat.runtime.agents')}
								description={t('settings.heartbeat.runtime.agentsDescription')}
								actions={<SettingsValue mono>{status?.agentCount ?? 0}</SettingsValue>}
							/>
							<SettingsRow
								icon={TimerReset}
								title={t('settings.heartbeat.runtime.nextDue')}
								description={t('settings.heartbeat.runtime.nextDueDescription')}
								actions={
									<SettingsValue>
										{nextDue ?? t('settings.heartbeat.values.notScheduled')}
									</SettingsValue>
								}
							/>
						</>
					)}
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.heartbeat.last.title')}
				description={t('settings.heartbeat.last.description')}
			>
				<SettingsPanel>
					{loading && !lastHeartbeat ? (
						<SettingsLoadingRows rows={3} />
					) : !lastHeartbeat ? (
						<SettingsEmptyState
							icon={BellOff}
							title={t('settings.heartbeat.last.emptyTitle')}
							description={t('settings.heartbeat.last.emptyDescription')}
						/>
					) : (
						<>
							<SettingsRow
								icon={Activity}
								title={t('settings.heartbeat.last.status')}
								actions={
									<Badge
										variant={statusVariant(lastHeartbeat.status)}
										className="h-5 rounded-md px-1.5 text-[10px]"
									>
										{t(`settings.heartbeat.status.${lastHeartbeat.status}`)}
									</Badge>
								}
							/>
							<SettingsRow
								icon={Clock3}
								title={t('settings.heartbeat.last.timestamp')}
								actions={
									<SettingsValue>
										{lastTimestamp ?? t('settings.heartbeat.values.unknown')}
									</SettingsValue>
								}
							/>
							{lastDuration && (
								<SettingsRow
									icon={TimerReset}
									title={t('settings.heartbeat.last.duration')}
									actions={<SettingsValue mono>{lastDuration}</SettingsValue>}
								/>
							)}
							<SettingsRow
								icon={RadioTower}
								title={t('settings.heartbeat.last.route')}
								actions={
									<div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
										<SettingsValue>
											{lastHeartbeat.channel ?? t('settings.heartbeat.values.noChannel')}
										</SettingsValue>
										{lastHeartbeat.target && (
											<SettingsValue className="max-w-52" mono>
												{lastHeartbeat.target}
											</SettingsValue>
										)}
										{lastHeartbeat.accountId && (
											<SettingsValue className="max-w-40" mono>
												{lastHeartbeat.accountId}
											</SettingsValue>
										)}
									</div>
								}
							/>
							{lastHeartbeat.reason && (
								<SettingsRow
									icon={AlertTriangle}
									title={t('settings.heartbeat.last.reason')}
									actions={
										<SettingsValue className="max-w-72" mono>
											{lastHeartbeat.reason}
										</SettingsValue>
									}
								/>
							)}
							{lastHeartbeat.preview && (
								<SettingsRow
									icon={Send}
									title={t('settings.heartbeat.last.preview')}
									description={lastHeartbeat.preview}
									className="sm:grid-cols-1"
									contentClassName="items-start"
								/>
							)}
						</>
					)}
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.heartbeat.controls.title')}
				description={t('settings.heartbeat.controls.description')}
			>
				<SettingsPanel>
					<SettingsRow
						icon={Zap}
						title={t('settings.heartbeat.controls.wakeNow')}
						description={t('settings.heartbeat.controls.wakeNowDescription')}
						actions={
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
						}
					/>
					<div className="grid gap-2 px-3 py-2">
						<SettingsField
							id="heartbeat-system-event"
							label={t('settings.heartbeat.controls.systemEvent')}
							description={t('settings.heartbeat.controls.systemEventDescription')}
						>
							<Textarea
								id="heartbeat-system-event"
								value={eventText}
								onChange={(event) => setEventText(event.target.value)}
								disabled={loading || isBusy}
								placeholder={t('settings.heartbeat.controls.systemEventPlaceholder')}
								className="min-h-20 resize-y text-xs leading-5 md:text-xs"
							/>
						</SettingsField>
						<div className="flex flex-wrap items-center gap-1.5">
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
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default HeartbeatPage;
