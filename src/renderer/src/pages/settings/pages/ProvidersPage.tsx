import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, LoaderCircle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DEFAULT_PROVIDERS } from '../../../../../shared/providers';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../components';

const MASKED_API_KEY = '••••••••' as const;

function ProviderMark({ name }: { readonly name: string }): React.JSX.Element {
	const initial = name.trim().slice(0, 1).toUpperCase();
	return (
		<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
			{initial}
		</div>
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
										<ProviderMark name={provider.name} />
										<div className="min-w-0 flex-1">
											<h2 className="truncate text-sm font-semibold leading-tight text-foreground">
												{provider.name}
											</h2>
											<p className="truncate font-mono text-xs font-medium leading-tight text-muted-foreground">
												{provider.baseUrl}
											</p>
										</div>
										<div className="flex shrink-0 items-center justify-end gap-2">
											{isSaved && !isEditing ? (
												<>
													<Badge variant="secondary" className="h-6 rounded-md px-2 text-xs font-semibold">
														<Check className="size-3" />
														{t('settings.providers.keySaved')}
													</Badge>
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														aria-label={`Edit ${provider.name} API key`}
														onClick={() => startEditing(provider.id)}
													>
														<Pencil className="size-3.5" />
													</Button>
												</>
											) : !isEditing ? (
												<Button
													type="button"
													variant="outline"
													size="xs"
													onClick={() => startEditing(provider.id)}
												>
													{t('settings.providers.keyMissing')}
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
												onChange={(e) =>
													setDrafts((current) => ({ ...current, [provider.id]: e.target.value }))
												}
												onKeyDown={(e) => {
													if (e.key === 'Enter' && canSave) void saveApiKey(provider.id);
												}}
												placeholder={t('settings.providers.apiKeyPlaceholder')}
												className="h-8 flex-1 rounded-md px-2.5 text-xs"
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
												{isBusy && <LoaderCircle className="size-3.5 animate-spin" />}
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
		</SettingsPageShell>
	);
};

export default ProvidersPage;
