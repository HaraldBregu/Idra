import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
	AlertTriangle,
	ChevronRight,
	FileText,
	LoaderCircle,
	RefreshCw,
	type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import type {
	MemoryFileSummary,
	MemoryReadRequest,
	MemoryReadResult,
} from '../../../../../../shared/memory';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const MEMORY_READ_LINES = 500;
const MEMORY_READ_MAX_CHARS = 64_000;

export interface MemoryFilePageConfig {
	readonly titleKey: string;
	readonly descriptionKey: string;
	readonly emptyTitleKey: string;
	readonly emptyDescriptionKey: string;
	readonly icon: LucideIcon;
	readonly listPath: string;
	readonly detailsPath: string;
	readonly listFiles: () => Promise<MemoryFileSummary[]>;
	readonly readFile: (request: MemoryReadRequest) => Promise<MemoryReadResult>;
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) return error.message;
	return fallback;
}

function normalizePathSeparators(value: string): string {
	return value.replace(/\\/g, '/');
}

function getFileName(filePath: string): string {
	const parts = normalizePathSeparators(filePath).split('/').filter(Boolean);
	return parts[parts.length - 1] ?? filePath;
}

function formatTimestamp(value: string): string {
	const time = Date.parse(value);
	if (!Number.isFinite(time)) return value;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(time));
}

function formatFileSize(size: number): string {
	if (!Number.isFinite(size) || size < 0) return '0 B';
	if (size < 1024) return `${size} B`;
	const kib = size / 1024;
	if (kib < 1024) return `${kib.toFixed(kib >= 10 ? 0 : 1)} KB`;
	const mib = kib / 1024;
	return `${mib.toFixed(mib >= 10 ? 0 : 1)} MB`;
}

function sortMemoryFiles(files: readonly MemoryFileSummary[]): MemoryFileSummary[] {
	return [...files].sort((a, b) => {
		const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
		if (Number.isFinite(updatedDiff) && updatedDiff !== 0) return updatedDiff;
		return a.relativePath.localeCompare(b.relativePath);
	});
}

function scopeLabel(file: MemoryFileSummary, t: ReturnType<typeof useTranslation>['t']): string {
	if (file.scopeKind === 'chat') {
		return t('settings.memory.scope.chat', { scopeId: file.scopeId });
	}
	return t('settings.memory.scope.global');
}

export function MemoryFileListPage({
	config,
}: {
	readonly config: MemoryFilePageConfig;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [files, setFiles] = useState<MemoryFileSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');

	const loadFiles = useCallback(async (): Promise<void> => {
		setLoading(true);
		setErrorMessage('');
		try {
			setFiles(await config.listFiles());
		} catch (error) {
			setFiles([]);
			setErrorMessage(getErrorMessage(error, t('settings.memory.errors.load')));
		} finally {
			setLoading(false);
		}
	}, [config, t]);

	useEffect(() => {
		void loadFiles();
	}, [loadFiles]);

	const sortedFiles = useMemo(() => sortMemoryFiles(files), [files]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t(config.titleKey)}
				description={t(config.descriptionKey)}
				icon={config.icon}
				action={
					<Button variant="outline" size="xs" onClick={loadFiles} disabled={loading}>
						{loading ? (
							<LoaderCircle className="size-3 animate-spin" />
						) : (
							<RefreshCw className="size-3" />
						)}
						{t('settings.memory.actions.refresh')}
					</Button>
				}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.memory.sectionTitle')}
				description={t('settings.memory.fileCount', { count: sortedFiles.length })}
			>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={3} />
					) : sortedFiles.length === 0 ? (
						<SettingsEmptyState
							icon={config.icon}
							title={t(config.emptyTitleKey)}
							description={t(config.emptyDescriptionKey)}
						/>
					) : (
						sortedFiles.map((file) => (
							<Item
								key={file.path}
								as="button"
								type="button"
								variant="outline"
								size="md"
								className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] border-b border-border/60 text-left hover:bg-muted/40 last:border-b-0"
								onClick={() => {
									navigate(`${config.detailsPath}?path=${encodeURIComponent(file.path)}`);
								}}
							>
								<ItemMedia className="size-6 rounded-md bg-muted/60 text-muted-foreground">
									<FileText className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
										{getFileName(file.relativePath)}
									</ItemTitle>
									<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
										{file.relativePath}
									</p>
									<p className="mt-0.5 w-full truncate text-[10px] leading-4 text-muted-foreground/80">
										{t('settings.memory.updatedAt', {
											time: formatTimestamp(file.updatedAt),
											size: formatFileSize(file.size),
										})}
									</p>
								</ItemContent>
								<ItemActions className="ml-0 flex-none justify-end gap-2">
									<Badge variant="secondary" className="h-5 max-w-28 truncate px-1.5 text-[10px]">
										{scopeLabel(file, t)}
									</Badge>
									<ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
								</ItemActions>
							</Item>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
}

export function MemoryFileDetailPage({
	config,
}: {
	readonly config: MemoryFilePageConfig;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [searchParams] = useSearchParams();
	const filePath = searchParams.get('path')?.trim() ?? '';
	const [file, setFile] = useState<MemoryReadResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const loadFile = useCallback(async (): Promise<void> => {
		if (!filePath) {
			setFile(null);
			setLoading(false);
			setErrorMessage(t('settings.memory.errors.missingPath'));
			return;
		}

		setLoading(true);
		setErrorMessage('');
		try {
			setFile(await config.readFile({
				path: filePath,
				lines: MEMORY_READ_LINES,
				maxChars: MEMORY_READ_MAX_CHARS,
			}));
		} catch (error) {
			setFile(null);
			setErrorMessage(getErrorMessage(error, t('settings.memory.errors.read')));
		} finally {
			setLoading(false);
		}
	}, [config, filePath, t]);

	useEffect(() => {
		void loadFile();
	}, [loadFile]);

	const handleLoadMore = useCallback(async (): Promise<void> => {
		if (!file || !file.nextFrom) return;
		setLoadingMore(true);
		setErrorMessage('');
		try {
			const nextFile = await config.readFile({
				path: file.path,
				from: file.nextFrom,
				lines: MEMORY_READ_LINES,
				maxChars: MEMORY_READ_MAX_CHARS,
			});
			setFile({
				...nextFile,
				from: file.from,
				lines: file.lines + nextFile.lines,
				text: [file.text, nextFile.text].filter(Boolean).join('\n'),
			});
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.memory.errors.read')));
		} finally {
			setLoadingMore(false);
		}
	}, [config, file, t]);

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.memory.detailsTitle')} icon={config.icon} />
				<SettingsPanel>
					<SettingsLoadingRows rows={3} />
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (!file) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.memory.detailsTitle')} icon={config.icon} />
				<SettingsPanel>
					<SettingsEmptyState
						icon={config.icon}
						title={t('settings.memory.notFoundTitle')}
						description={errorMessage || t('settings.memory.notFoundDescription')}
						className="min-h-28"
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={getFileName(file.path)}
				description={file.path}
				icon={config.icon}
				action={
					<Button variant="outline" size="xs" onClick={loadFile} disabled={loadingMore}>
						<RefreshCw className="size-3" />
						{t('settings.memory.actions.refresh')}
					</Button>
				}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.memory.sectionTitle')}
				description={t('settings.memory.readWindow', {
					lines: file.lines,
					total: file.lineCount,
				})}
			>
				<SettingsPanel>
					<pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-5 text-foreground">
						{file.text || t('settings.memory.emptyFile')}
					</pre>
					{file.truncated && (
						<div className="flex justify-end border-t border-border/60 px-3 py-2">
							<Button
								variant="outline"
								size="xs"
								onClick={() => void handleLoadMore()}
								disabled={loadingMore}
							>
								{loadingMore && <LoaderCircle className="size-3 animate-spin" />}
								{t('settings.memory.actions.loadMore')}
							</Button>
						</div>
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
}
