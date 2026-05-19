import React, { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, LoaderCircle, Pencil, Plug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { openExternalUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';
import {
	DEFAULT_PROVIDERS,
	getProviderApiConfigurationUrl,
} from '../../../../../../shared/providers';
import {
	CONNECTOR_CATALOG_COUNTS,
	CONNECTOR_PROVIDER_PLATFORMS,
	type ConnectorProviderPlatform,
} from '../../../../../../shared/connectors';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';

const MASKED_API_KEY = '••••••••' as const;
const MAX_VISIBLE_PATTERNS = 4;

function formatConnectorProviderRole(value: string): string {
	return value.replaceAll('_', ' ');
}

function connectorProviderPrimaryDocsUrl(provider: ConnectorProviderPlatform): string {
	return provider.documentationPages[0]?.url ?? provider.websiteUrl;
}

function ConnectorProviderPlatformCard({
	provider,
}: {
	readonly provider: ConnectorProviderPlatform;
}): React.JSX.Element {
	const visiblePatterns = provider.supportedPatterns.slice(0, MAX_VISIBLE_PATTERNS);
	const remainingPatterns = provider.supportedPatterns.length - visiblePatterns.length;

	return (
		<Card className="rounded-lg border-border bg-card py-0 shadow-none">
			<CardContent className="p-0">
				<div className="grid gap-2.5 px-3 py-3">
					<div className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-2.5">
						<div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
							<Plug className="size-3.5" strokeWidth={1.8} />
						</div>
						<div className="min-w-0">
							<div className="flex min-w-0 flex-wrap items-center gap-1.5">
								<h3 className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
									{provider.name}
								</h3>
								{provider.id === 'composio' && (
									<Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
										Primary
									</Badge>
								)}
							</div>
							<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
								{formatConnectorProviderRole(provider.recommendedRole)}
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label={`Open ${provider.name} website`}
								onClick={() => openExternalUrl(provider.websiteUrl)}
							>
								<ExternalLink className="size-3" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="xs"
								onClick={() => openExternalUrl(connectorProviderPrimaryDocsUrl(provider))}
							>
								Docs
							</Button>
						</div>
					</div>

					<p className="line-clamp-2 text-xs leading-4 text-foreground/85">
						{provider.bestFor}
					</p>

					<div className="flex flex-wrap gap-1">
						<Badge variant="outline" className="h-4 max-w-full px-1.5 text-[10px]">
							<span className="truncate">{provider.category}</span>
						</Badge>
						{visiblePatterns.map((pattern) => (
							<Badge key={pattern} variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
								{pattern}
							</Badge>
						))}
						{remainingPatterns > 0 && (
							<Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
								+{remainingPatterns}
							</Badge>
						)}
					</div>

					<div className="grid gap-1 text-[11px] leading-4 text-muted-foreground">
						<p className="line-clamp-1">{provider.coverageSummary}</p>
						<p className="line-clamp-1">{provider.notes}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const [editing, setEditing] = useState<Record<string, boolean>>({});
	const [saving, setSaving] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void Promise.all(
			DEFAULT_PROVIDERS.map(async (provider) => {
				const saved = await window.app.isProviderApiKeySaved(provider.id);
				return [provider.id, saved] as const;
			})
		).then((entries) => setApiKeyStatus(Object.fromEntries(entries)));
	}, []);

	const startEditing = (providerId: string): void => {
		setEditing((current) => ({ ...current, [providerId]: true }));
		setDrafts((current) => ({ ...current, [providerId]: '' }));
		setError(null);
	};

	const cancelEditing = (providerId: string): void => {
		setEditing((current) => ({ ...current, [providerId]: false }));
		setDrafts((current) => ({ ...current, [providerId]: '' }));
		setError(null);
	};

	const saveApiKey = async (providerId: string): Promise<void> => {
		const draft = drafts[providerId]?.trim() ?? '';
		if (!draft || draft === MASKED_API_KEY) return;
		setSaving(providerId);
		setError(null);
		try {
			await window.app.setProviderApiKey(providerId, draft);
			setApiKeyStatus((current) => ({ ...current, [providerId]: true }));
			setEditing((current) => ({ ...current, [providerId]: false }));
			setDrafts((current) => ({ ...current, [providerId]: '' }));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(null);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.providers')}
				description={t('settings.providers.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.providers.registeredProviders')}>
				<div className="space-y-2">
					{DEFAULT_PROVIDERS.map((provider) => {
						const isSaved = apiKeyStatus[provider.id] ?? false;
						const isEditing = editing[provider.id] ?? false;
						const draft = drafts[provider.id] ?? '';
						const isBusy = saving === provider.id;
						const canSave = draft.trim().length > 0 && !isBusy;
						const apiConfigurationUrl = getProviderApiConfigurationUrl(provider);

						return (
							<Card
								key={provider.id}
								className={cn(
									'rounded-lg border-border bg-card py-0 shadow-none',
									isEditing && 'border-ring ring-2 ring-ring/20'
								)}
							>
								<CardContent className="p-0">
									<div
										className={cn(
											'grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5',
											isEditing && 'pb-2'
										)}
									>
										<ProviderAvatar providerId={provider.id} name={provider.name} />
										<div className="min-w-0 flex-1">
											<div className="flex min-w-0 items-center gap-1.5">
												<h2 className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
													{provider.name}
												</h2>
												<Button
													type="button"
													variant="ghost"
													size="icon-xs"
													className="size-5 text-muted-foreground hover:text-foreground"
													aria-label={`Open ${provider.name} API setup`}
													onClick={() => openExternalUrl(apiConfigurationUrl)}
												>
													<ExternalLink className="size-3" />
												</Button>
											</div>
											<p className="truncate text-xs font-medium leading-tight text-muted-foreground">
												{isSaved ? 'sk-************' : (provider.capabilities ?? provider.baseUrl)}
											</p>
										</div>
										<div className="flex shrink-0 justify-end gap-2">
											{isSaved && !isEditing ? (
												<Button
													type="button"
													variant="ghost"
													size="icon-xs"
													aria-label={`Edit ${provider.name} API key`}
													onClick={() => startEditing(provider.id)}
												>
													<Pencil className="size-3.5" />
												</Button>
											) : !isEditing ? (
												<Button
													type="button"
													variant="outline"
													size="xs"
													onClick={() => startEditing(provider.id)}
												>
													Connect
												</Button>
											) : null}
										</div>
									</div>

									{isEditing && (
										<div className="flex items-center gap-2 px-3 pb-3">
											<Input
												autoComplete="off"
												type="password"
												value={draft}
												onChange={(event) =>
													setDrafts((current) => ({
														...current,
														[provider.id]: event.target.value,
													}))
												}
												onKeyDown={(event) => {
													if (event.key === 'Enter' && canSave) void saveApiKey(provider.id);
												}}
												placeholder={t('settings.providers.apiKeyPlaceholder')}
												className="h-8 flex-1 rounded-md border-input bg-card px-2.5 text-xs font-semibold placeholder:text-muted-foreground"
												aria-label={`${provider.name} API key`}
												disabled={isBusy}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={isBusy}
												onClick={() => cancelEditing(provider.id)}
											>
												{t('common.cancel')}
											</Button>
											<Button
												type="button"
												size="sm"
												disabled={!canSave}
												onClick={() => void saveApiKey(provider.id)}
											>
												{isBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
												{t('common.save')}
											</Button>
										</div>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</SettingsSection>

			<SettingsSection
				title={t('settings.providers.connectorProviderPlatforms')}
				description={t('settings.providers.connectorProviderPlatformsDescription')}
				action={
					<Badge variant="outline" className="h-5 rounded-md bg-muted/40 px-1.5 text-[10px] text-muted-foreground">
						{CONNECTOR_CATALOG_COUNTS.providerPlatforms} platforms
					</Badge>
				}
			>
				<div className="grid gap-2 md:grid-cols-2">
					{CONNECTOR_PROVIDER_PLATFORMS.map((provider) => (
						<ConnectorProviderPlatformCard key={provider.id} provider={provider} />
					))}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ProvidersPage;
