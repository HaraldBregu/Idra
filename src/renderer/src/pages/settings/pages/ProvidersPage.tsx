import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Save, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEFAULT_PROVIDERS } from '../../../../../shared/providers';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../components';

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});
	const [drafts, setDrafts] = useState<Record<string, string>>({});
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

	const saveApiKey = async (providerId: string): Promise<void> => {
		const apiKey = drafts[providerId]?.trim() ?? '';
		if (!apiKey) return;
		setSaving(providerId);
		setError(null);
		try {
			await window.app.setProviderApiKey(providerId, apiKey);
			setApiKeyStatus((current) => ({ ...current, [providerId]: true }));
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
				<SettingsPanel>
					{DEFAULT_PROVIDERS.map((provider) => {
						const isSaved = apiKeyStatus[provider.id] ?? false;
						const draft = drafts[provider.id] ?? '';
						const isBusy = saving === provider.id;

						return (
							<Item key={provider.id} variant="outline" size="sm" className="border-b border-border/60 last:border-b-0">
								<ItemMedia variant="icon">
									<Server className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent>
									<div>
										<ItemTitle>
											<span className="flex min-w-0 flex-wrap items-center gap-1.5">
												<span className="truncate">{provider.name}</span>
												<Badge variant="outline" className="h-4 px-1.5 font-mono text-[10px]">
													{provider.id}
												</Badge>
											</span>
										</ItemTitle>
										<p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{provider.baseUrl}</p>
									</div>
								</ItemContent>
								<ItemActions className="flex-wrap gap-1.5 sm:flex-nowrap">
									<Badge
										variant={isSaved ? 'secondary' : 'outline'}
										className="h-5 shrink-0 px-1.5 text-[10px]"
									>
										{isSaved ? (
											<CheckCircle2 className="mr-0.5 size-2.5" />
										) : (
											<KeyRound className="mr-0.5 size-2.5" />
										)}
										{isSaved
											? t('settings.providers.keySaved')
											: t('settings.providers.keyMissing')}
									</Badge>
									<Input
										type="password"
										value={draft}
										onChange={(e) =>
											setDrafts((current) => ({ ...current, [provider.id]: e.target.value }))
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && draft.trim()) void saveApiKey(provider.id);
										}}
										placeholder={t('settings.providers.apiKeyPlaceholder')}
										className="h-7 min-w-0 px-2 text-xs sm:w-56 md:text-xs"
										aria-label={`${provider.name} ${t('providers.apiKey')}`}
									/>
									<Button
										type="button"
										size="xs"
										variant="outline"
										onClick={() => void saveApiKey(provider.id)}
										disabled={!draft.trim() || isBusy}
									>
										<Save className="size-3" />
										{t('common.save')}
									</Button>
								</ItemActions>
							</Item>
						);
					})}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ProvidersPage;
