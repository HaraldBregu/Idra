import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Clock3,
	Filter,
	LoaderCircle,
	RefreshCw,
	SearchCode,
	ServerCog,
	type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
	MonitorEventFilter,
	MonitorEventRecord,
	MonitorEventSeverity,
	MonitorEventSource,
} from '../../../../../../shared/monitor';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

type SourceFilter = 'all' | MonitorEventSource;
type SeverityFilter = 'all' | MonitorEventSeverity;
type TimeRangeFilter = 'all' | '15m' | '1h' | '24h';
type LimitFilter = '50' | '100' | '250' | '500';

interface MonitoringFilters {
	readonly source: SourceFilter;
	readonly severity: SeverityFilter;
	readonly category: string;
	readonly eventType: string;
	readonly timeRange: TimeRangeFilter;
	readonly limit: LimitFilter;
}

interface MonitoringSummary {
	readonly total: number;
	readonly errors: number;
	readonly warnings: number;
	readonly categories: number;
}

const DEFAULT_FILTERS: MonitoringFilters = {
	source: 'all',
	severity: 'all',
	category: '',
	eventType: '',
	timeRange: 'all',
	limit: '100',
};

const TIME_RANGE_MS: Record<Exclude<TimeRangeFilter, 'all'>, number> = {
	'15m': 15 * 60_000,
	'1h': 60 * 60_000,
	'24h': 24 * 60 * 60_000,
};

function buildMonitorFilter(filters: MonitoringFilters): MonitorEventFilter {
	const filter: MonitorEventFilter = {
		limit: Number(filters.limit),
	};
	const category = filters.category.trim();
	const eventType = filters.eventType.trim();

	if (filters.source !== 'all') filter.source = filters.source;
	if (filters.severity !== 'all') filter.severity = filters.severity;
	if (category) filter.category = category;
	if (eventType) filter.eventType = eventType;

	return filter;
}

function parseRecordTime(record: MonitorEventRecord): number {
	const observedAt = Date.parse(record.observedAt);
	if (Number.isFinite(observedAt)) return observedAt;
	return Number.isFinite(record.eventTimestamp) ? record.eventTimestamp : 0;
}

function sortRecords(records: readonly MonitorEventRecord[]): MonitorEventRecord[] {
	return [...records].sort((a, b) => parseRecordTime(b) - parseRecordTime(a));
}

function isRecordInTimeRange(record: MonitorEventRecord, timeRange: TimeRangeFilter): boolean {
	if (timeRange === 'all') return true;
	const observedAt = parseRecordTime(record);
	if (!observedAt) return false;
	return Date.now() - observedAt <= TIME_RANGE_MS[timeRange];
}

function recordMatchesFilters(record: MonitorEventRecord, filters: MonitoringFilters): boolean {
	const category = filters.category.trim();
	const eventType = filters.eventType.trim();

	if (filters.source !== 'all' && record.source !== filters.source) return false;
	if (filters.severity !== 'all' && record.severity !== filters.severity) return false;
	if (category && record.category !== category) return false;
	if (eventType && record.eventType !== eventType) return false;
	return isRecordInTimeRange(record, filters.timeRange);
}

function formatTimestamp(value: string | number): string | null {
	const time = typeof value === 'number' ? value : Date.parse(value);
	if (!Number.isFinite(time)) return null;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'medium',
	}).format(new Date(time));
}

function formatPayload(payload: unknown): string {
	if (payload === undefined || payload === null) return '';
	try {
		return JSON.stringify(payload, null, 2);
	} catch {
		return String(payload);
	}
}

function severityBadgeClassName(severity: MonitorEventSeverity): string {
	switch (severity) {
		case 'error':
			return 'border-destructive/30 bg-destructive/10 text-destructive';
		case 'warn':
			return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
		default:
			return 'border-border/70 bg-muted/40 text-muted-foreground';
	}
}

function severityIconClassName(severity: MonitorEventSeverity): string {
	switch (severity) {
		case 'error':
			return 'bg-destructive/10 text-destructive';
		case 'warn':
			return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
		default:
			return 'bg-muted/60 text-muted-foreground';
	}
}

function severityIcon(severity: MonitorEventSeverity): LucideIcon {
	switch (severity) {
		case 'error':
			return AlertCircle;
		case 'warn':
			return AlertTriangle;
		default:
			return Activity;
	}
}

function summaryForRecords(records: readonly MonitorEventRecord[]): MonitoringSummary {
	return {
		total: records.length,
		errors: records.filter((record) => record.severity === 'error').length,
		warnings: records.filter((record) => record.severity === 'warn').length,
		categories: new Set(records.map((record) => record.category)).size,
	};
}

function MonitoringMetric({
	icon: Icon,
	label,
	value,
}: {
	readonly icon: LucideIcon;
	readonly label: React.ReactNode;
	readonly value: React.ReactNode;
}): React.JSX.Element {
	return (
		<div className="flex min-h-20 min-w-0 items-center gap-3 border-b border-border/60 px-3 py-3 sm:border-r sm:last:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+4)]:border-b-0">
			<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
				<Icon className="size-3.5" strokeWidth={1.8} />
			</div>
			<div className="min-w-0">
				<div className="text-lg font-semibold leading-5 tracking-normal text-foreground">
					{value}
				</div>
				<div className="mt-1 truncate text-[11px] leading-4 text-muted-foreground/60">
					{label}
				</div>
			</div>
		</div>
	);
}

function SeverityBadge({
	severity,
}: {
	readonly severity: MonitorEventSeverity;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<Badge
			variant="outline"
			className={cn('h-5 border px-1.5 text-[10px]', severityBadgeClassName(severity))}
		>
			{t(`settings.monitoring.severity.${severity}`)}
		</Badge>
	);
}

function MonitorEventItem({
	record,
}: {
	readonly record: MonitorEventRecord;
}): React.JSX.Element {
	const { t } = useTranslation();
	const Icon = severityIcon(record.severity);
	const payload = formatPayload(record.payload);
	const observedAt = formatTimestamp(record.observedAt) ?? t('settings.monitoring.values.unknown');
	const eventTimestamp =
		formatTimestamp(record.eventTimestamp) ?? t('settings.monitoring.values.unknown');

	return (
		<Item
			as="div"
			variant="outline"
			size="md"
			className="items-start border-b border-border/60 last:border-b-0"
		>
			<ItemMedia variant="icon" className={cn('mt-0.5', severityIconClassName(record.severity))}>
				<Icon className="size-3" strokeWidth={1.8} />
			</ItemMedia>
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-2">
				<div className="flex w-full min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
							{record.eventType}
						</ItemTitle>
						<div className="mt-1 flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-muted-foreground/60">
							<span className="max-w-40 truncate font-mono">{record.source}</span>
							<span className="max-w-40 truncate">{record.category}</span>
							<span>{observedAt}</span>
						</div>
					</div>
					<ItemActions className="ml-0 flex-none items-center justify-start gap-1.5 sm:ml-auto sm:justify-end">
						<SeverityBadge severity={record.severity} />
					</ItemActions>
				</div>

				<div className="grid w-full min-w-0 gap-1 text-[11px] leading-4 text-muted-foreground sm:grid-cols-2">
					<div className="min-w-0 truncate">
						<span className="font-medium text-foreground">{t('settings.monitoring.fields.id')}:</span>{' '}
						<span className="font-mono">{record.id}</span>
					</div>
					<div className="min-w-0 truncate">
						<span className="font-medium text-foreground">
							{t('settings.monitoring.fields.eventTimestamp')}:
						</span>{' '}
						{eventTimestamp}
					</div>
				</div>

				<details className="group w-full min-w-0 overflow-hidden rounded-md border border-border/60 bg-muted/20">
					<summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-[11px] font-medium text-foreground outline-none transition-colors hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
						<span>{t('settings.monitoring.events.payload')}</span>
						<SearchCode className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
					</summary>
					{payload ? (
						<pre className="max-h-64 overflow-auto border-t border-border/60 p-2 text-[11px] leading-4 text-muted-foreground/60">
							{payload}
						</pre>
					) : (
						<div className="border-t border-border/60 px-2 py-2 text-[11px] leading-4 text-muted-foreground/60">
							{t('settings.monitoring.events.payloadEmpty')}
						</div>
					)}
				</details>
			</ItemContent>
		</Item>
	);
}

const MonitoringPage: React.FC = () => {
	const { t } = useTranslation();
	const [filters, setFilters] = useState<MonitoringFilters>(DEFAULT_FILTERS);
	const [records, setRecords] = useState<readonly MonitorEventRecord[]>([]);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const mountedRef = useRef(true);
	const requestIdRef = useRef(0);

	const monitorFilter = useMemo(() => buildMonitorFilter(filters), [filters]);
	const visibleRecords = useMemo(
		() => records.filter((record) => isRecordInTimeRange(record, filters.timeRange)),
		[filters.timeRange, records]
	);
	const summary = useMemo(() => summaryForRecords(visibleRecords), [visibleRecords]);
	const hasActiveFilters = useMemo(
		() => JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS),
		[filters]
	);

	const updateFilter = useCallback(
		<TKey extends keyof MonitoringFilters>(key: TKey, value: MonitoringFilters[TKey]): void => {
			setFilters((current) => ({ ...current, [key]: value }));
		},
		[]
	);

	const refreshSnapshot = useCallback(
		async (showLoading = false): Promise<void> => {
			const requestId = requestIdRef.current + 1;
			requestIdRef.current = requestId;
			if (showLoading) setLoading(true);
			setError(null);

			try {
				const snapshot = await window.monitor.snapshot(monitorFilter);
				if (!mountedRef.current || requestId !== requestIdRef.current) return;
				setRecords(sortRecords(snapshot.records));
				setGeneratedAt(snapshot.generatedAt);
			} catch (caught) {
				if (!mountedRef.current || requestId !== requestIdRef.current) return;
				setError(caught instanceof Error ? caught.message : String(caught));
				setRecords([]);
				setGeneratedAt(null);
			} finally {
				if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
			}
		},
		[monitorFilter]
	);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			requestIdRef.current += 1;
		};
	}, []);

	useEffect(() => {
		void refreshSnapshot(true);
	}, [refreshSnapshot]);

	useEffect(() => {
		return window.monitor.onEvent((record) => {
			if (!recordMatchesFilters(record, filters)) return;
			setRecords((current) =>
				sortRecords([
					record,
					...current.filter((item) => item.id !== record.id),
				]).slice(0, Number(filters.limit))
			);
			setGeneratedAt(new Date().toISOString());
		});
	}, [filters]);

	const generatedLabel = generatedAt
		? formatTimestamp(generatedAt) ?? t('settings.monitoring.values.unknown')
		: t('settings.monitoring.values.unknown');

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.monitoring')}
				description={t('settings.monitoring.description')}
				action={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void refreshSnapshot(true)}
						disabled={loading}
					>
						{loading ? (
							<LoaderCircle className="size-3 animate-spin" />
						) : (
							<RefreshCw className="size-3" />
						)}
						{t('settings.monitoring.actions.refresh')}
					</Button>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertCircle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.monitoring.summary.title')}
				description={t('settings.monitoring.summary.description')}
			>
				<SettingsPanel>
					<div className="grid sm:grid-cols-2 lg:grid-cols-4">
						<MonitoringMetric
							icon={Activity}
							label={t('settings.monitoring.summary.records')}
							value={summary.total}
						/>
						<MonitoringMetric
							icon={AlertCircle}
							label={t('settings.monitoring.summary.errors')}
							value={summary.errors}
						/>
						<MonitoringMetric
							icon={AlertTriangle}
							label={t('settings.monitoring.summary.warnings')}
							value={summary.warnings}
						/>
						<MonitoringMetric
							icon={ServerCog}
							label={t('settings.monitoring.summary.categories')}
							value={summary.categories}
						/>
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.monitoring.filters.title')}
				description={t('settings.monitoring.filters.description')}
				action={
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={() => setFilters(DEFAULT_FILTERS)}
						disabled={!hasActiveFilters}
					>
						{t('settings.monitoring.actions.clearFilters')}
					</Button>
				}
			>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3 sm:grid-cols-2 lg:grid-cols-3">
						<SettingsField id="monitor-source" label={t('settings.monitoring.filters.source')}>
							<Select
								value={filters.source}
								onValueChange={(value) =>
									updateFilter('source', (value ?? DEFAULT_FILTERS.source) as SourceFilter)
								}
							>
								<SelectTrigger id="monitor-source" className="w-full text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">{t('settings.monitoring.filters.allSources')}</SelectItem>
									<SelectItem value="event-bus">event-bus</SelectItem>
								</SelectContent>
							</Select>
						</SettingsField>

						<SettingsField id="monitor-severity" label={t('settings.monitoring.filters.severity')}>
							<Select
								value={filters.severity}
								onValueChange={(value) =>
									updateFilter('severity', (value ?? DEFAULT_FILTERS.severity) as SeverityFilter)
								}
							>
								<SelectTrigger id="monitor-severity" className="w-full text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">{t('settings.monitoring.filters.allSeverities')}</SelectItem>
									<SelectItem value="info">{t('settings.monitoring.severity.info')}</SelectItem>
									<SelectItem value="warn">{t('settings.monitoring.severity.warn')}</SelectItem>
									<SelectItem value="error">{t('settings.monitoring.severity.error')}</SelectItem>
								</SelectContent>
							</Select>
						</SettingsField>

						<SettingsField id="monitor-time-range" label={t('settings.monitoring.filters.timeRange')}>
							<Select
								value={filters.timeRange}
								onValueChange={(value) =>
									updateFilter('timeRange', (value ?? DEFAULT_FILTERS.timeRange) as TimeRangeFilter)
								}
							>
								<SelectTrigger id="monitor-time-range" className="w-full text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">{t('settings.monitoring.filters.allTime')}</SelectItem>
									<SelectItem value="15m">{t('settings.monitoring.filters.last15m')}</SelectItem>
									<SelectItem value="1h">{t('settings.monitoring.filters.lastHour')}</SelectItem>
									<SelectItem value="24h">{t('settings.monitoring.filters.lastDay')}</SelectItem>
								</SelectContent>
							</Select>
						</SettingsField>

						<SettingsField id="monitor-category" label={t('settings.monitoring.filters.category')}>
							<Input
								id="monitor-category"
								value={filters.category}
								onChange={(event) => updateFilter('category', event.currentTarget.value)}
								placeholder={t('settings.monitoring.filters.categoryPlaceholder')}
								className="h-8 text-xs"
							/>
						</SettingsField>

						<SettingsField id="monitor-event-type" label={t('settings.monitoring.filters.eventType')}>
							<Input
								id="monitor-event-type"
								value={filters.eventType}
								onChange={(event) => updateFilter('eventType', event.currentTarget.value)}
								placeholder={t('settings.monitoring.filters.eventTypePlaceholder')}
								className="h-8 text-xs"
							/>
						</SettingsField>

						<SettingsField id="monitor-limit" label={t('settings.monitoring.filters.limit')}>
							<Select
								value={filters.limit}
								onValueChange={(value) =>
									updateFilter('limit', (value ?? DEFAULT_FILTERS.limit) as LimitFilter)
								}
							>
								<SelectTrigger id="monitor-limit" className="w-full text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="50">50</SelectItem>
									<SelectItem value="100">100</SelectItem>
									<SelectItem value="250">250</SelectItem>
									<SelectItem value="500">500</SelectItem>
								</SelectContent>
							</Select>
						</SettingsField>
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.monitoring.events.title')}
				description={t('settings.monitoring.events.description')}
				action={
					<div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground/60">
						<Clock3 className="size-3 shrink-0" strokeWidth={1.8} />
						<span className="truncate">
							{t('settings.monitoring.events.generatedAt', { time: generatedLabel })}
						</span>
					</div>
				}
			>
				{loading ? (
					<SettingsPanel>
						<SettingsLoadingRows rows={4} />
					</SettingsPanel>
				) : visibleRecords.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Filter}
							title={t('settings.monitoring.events.emptyTitle')}
							description={t('settings.monitoring.events.emptyDescription')}
							className="min-h-28"
						/>
					</SettingsPanel>
				) : (
					<SettingsPanel>
						{visibleRecords.map((record) => (
							<MonitorEventItem key={record.id} record={record} />
						))}
					</SettingsPanel>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default MonitoringPage;
