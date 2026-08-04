import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ExternalLink, LoaderCircle, Pencil } from 'lucide-react';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { openExternalUrl } from '@/lib/external-links';
import { providers } from '@/lib/providers';
import { cn } from '@/lib/utils';
import { MASKED_API_KEY_LABEL } from '../../../start/constants';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';

const EmailPage: React.FC = () => {
	const { t } = useTranslation();
	const [configured, setConfigured] = useState(false);
	const [apiKey, setApiKey] = useState('');
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const provider = providers().find((entry) => entry.id === 'resend');

	useEffect(() => {
		void window.email
			.getSettings()
			.then((settings) => {
				setConfigured(settings.configured.resend);
				setEditing(!settings.configured.resend);
			})
			.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
			.finally(() => setLoading(false));
	}, []);

	const handleSave = async (): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const settings = await window.email.saveProvider('resend', { apiKey });
			setConfigured(settings.configured.resend);
			setApiKey('');
			setEditing(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.email.title')}
				description={t('settings.email.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.email.providers')}>
				<Card
					className={cn(
						'rounded-lg border-border bg-card py-0 shadow-none',
						editing && 'border-ring ring-2 ring-ring/20'
					)}
				>
					<CardContent className="p-0">
						<div
							className={cn(
								'grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5',
								editing && 'pb-2'
							)}
						>
							<ProviderAvatar
								providerId="resend"
								name="Resend"
								iconDarkUrl={provider?.iconDarkUrl}
								iconLightUrl={provider?.iconLightUrl}
							/>
							<div className="min-w-0 flex-1">
								<div className="flex min-w-0 items-center gap-1.5">
									<h2 className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
										Resend
									</h2>
									{provider?.apiKeyUrl && (
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											className="size-5 text-muted-foreground hover:text-foreground"
											aria-label="Open Resend API setup"
											onClick={() => void openExternalUrl(provider.apiKeyUrl!)}
										>
											<ExternalLink className="size-3" />
										</Button>
									)}
								</div>
								<p className="truncate text-xs font-medium leading-tight text-muted-foreground">
									{loading
										? t('settings.email.loading')
										: configured
											? MASKED_API_KEY_LABEL
											: t('settings.email.description')}
								</p>
							</div>
							<div className="flex shrink-0 justify-end gap-2">
								{configured && !editing ? (
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										aria-label="Edit Resend API key"
										onClick={() => setEditing(true)}
									>
										<Pencil className="size-3.5" />
									</Button>
								) : !editing ? (
									<Button
										type="button"
										variant="outline"
										size="xs"
										disabled={loading}
										onClick={() => setEditing(true)}
									>
										Connect
									</Button>
								) : null}
							</div>
						</div>

						{editing && (
							<div className="flex items-center gap-2 px-3 pb-3">
								<Input
									type="password"
									value={apiKey}
									onChange={(event) => setApiKey(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' && apiKey.trim() && !saving) void handleSave();
									}}
									placeholder={t('settings.email.apiKeyPlaceholder')}
									aria-label={t('settings.email.apiKey')}
									autoComplete="off"
									className="h-8 flex-1 rounded-md border-input bg-card px-2.5 text-xs font-semibold placeholder:text-muted-foreground"
									disabled={loading || saving}
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={saving}
									onClick={() => {
										setApiKey('');
										setEditing(false);
									}}
								>
									{t('common.cancel')}
								</Button>
								<Button
									type="button"
									size="sm"
									disabled={loading || saving || !apiKey.trim()}
									onClick={() => void handleSave()}
								>
									{saving && <LoaderCircle className="size-3.5 animate-spin" />}
									{t('common.save')}
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default EmailPage;
