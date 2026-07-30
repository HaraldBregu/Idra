import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ProviderAvatar } from '@/components/provider-avatar';
import { cn } from '@/lib/utils';
import { databases } from '@/lib/providers';
import { openExternalUrl } from '@/lib/external-links';
import { SettingsField, SettingsNotice } from '../../settings/components';
import { getErrorMessage, MASKED_API_KEY_LABEL } from '../constants';
import type { ProviderCatalogItem } from '../types';

const mask = (value: string): string =>
	value.length > 4 ? `••••${value.slice(-4)}` : '•'.repeat(value.length);

interface DatabaseProviderCardProps {
	readonly provider: ProviderCatalogItem;
}

export function DatabaseProviderCard({
	provider,
}: DatabaseProviderCardProps): React.JSX.Element {
	const { t } = useTranslation();
	const [canonical, setCanonical] = useState('');
	const [draft, setDraft] = useState('');
	const [editing, setEditing] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.provider.get(provider.id).then(
			(stored) => {
				if (cancelled) return;
				setCanonical(stored?.apiKey ?? '');
				setDraft(stored?.apiKey ?? '');
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.vectorDb.errors.load')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [provider.id, t]);

	const startEditing = (): void => {
		setDraft(canonical);
		setEditing(true);
		setExpanded(true);
		setStatus(null);
		setError(null);
	};

	const cancelEditing = (): void => {
		setDraft(canonical);
		setEditing(false);
		setStatus(null);
		setError(null);
	};

	const save = async (): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const saved = await window.provider.set(
				{
					id: provider.id,
					name: provider.name,
					apiKey: draft.trim(),
					baseUrl: databases().find((entry) => entry.provider.id === provider.id)?.url ?? '',
				},
				'databases'
			);
			setCanonical(saved.apiKey);
			setDraft(saved.apiKey);
			setEditing(false);
			setStatus(t('settings.vectorDb.saved'));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.vectorDb.errors.save')));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card size="sm">
			<Collapsible open={expanded} onOpenChange={setExpanded} className="flex flex-col gap-3">
				<CardHeader className={cn('select-none items-center', expanded && 'border-b')}>
					<div className="flex min-w-0 flex-1 items-center gap-2.5">
						<ProviderAvatar providerId={provider.id} name={provider.name} />
						<div className="min-w-0 flex-1">
							<div className="flex min-w-0 items-center gap-1.5">
								<CardTitle className="min-w-0 truncate">{provider.name}</CardTitle>
								{provider.apiConfigurationUrl && (
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className="size-5 text-muted-foreground hover:text-foreground"
										aria-label={`Open ${provider.name} API setup`}
										onClick={(event) => {
											event.stopPropagation();
											openExternalUrl(provider.apiConfigurationUrl ?? '');
										}}
									>
										<ExternalLink className="size-3" />
									</Button>
								)}
							</div>
							<p className="truncate text-xs font-medium leading-tight text-muted-foreground">
								{canonical ? MASKED_API_KEY_LABEL : provider.capabilities}
							</p>
						</div>
					</div>
					<CardAction
						className="row-span-1 flex items-center gap-2 self-center"
						onClick={(event) => event.stopPropagation()}
					>
						<CollapsibleTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={
										expanded ? t('settings.vectorDb.collapse') : t('settings.vectorDb.expand')
									}
								>
									<ChevronDown
										className={cn('size-3 transition-transform', expanded && 'rotate-180')}
									/>
								</Button>
							}
						/>
						{!editing && (
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={t('settings.vectorDb.edit')}
								onClick={startEditing}
							>
								<Pencil className="size-3" />
							</Button>
						)}
					</CardAction>
				</CardHeader>

				<CollapsibleContent className="flex flex-col gap-3">
					<CardContent className="space-y-4">
						{error && (
							<SettingsNotice variant="destructive" icon={AlertTriangle}>
								{error}
							</SettingsNotice>
						)}
						{status && <SettingsNotice icon={CheckCircle2}>{status}</SettingsNotice>}

						<section className="space-y-3">
							<h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
								{t('settings.vectorDb.connectionTitle')}
							</h3>
							{editing ? (
								<SettingsField
									id={`start-database-${provider.id}-api-key`}
									label={t('settings.vectorDb.apiKey')}
									description={t('settings.vectorDb.apiKeyDescription')}
								>
									<Input
										id={`start-database-${provider.id}-api-key`}
										type="password"
										value={draft}
										placeholder={t('settings.vectorDb.apiKeyPlaceholder')}
										autoComplete="off"
										onChange={(event) => {
											setDraft(event.target.value);
											setStatus(null);
										}}
									/>
								</SettingsField>
							) : (
								<div className="flex min-w-0 flex-col gap-1">
									<span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
										{t('settings.vectorDb.apiKey')}
									</span>
									<span className="truncate font-mono text-xs text-foreground">
										{canonical ? mask(canonical) : t('settings.vectorDb.notConfigured')}
									</span>
								</div>
							)}
						</section>
					</CardContent>

					{editing && (
						<CardFooter className="justify-end gap-2">
							<Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
								{t('settings.vectorDb.cancel')}
							</Button>
							<Button size="sm" onClick={() => void save()} disabled={saving || !draft.trim()}>
								{saving ? t('settings.vectorDb.saving') : t('settings.vectorDb.save')}
							</Button>
						</CardFooter>
					)}
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}
