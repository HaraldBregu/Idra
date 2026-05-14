import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Plus, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProviderInput, PublicProvider } from '../../../../../shared/providers';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../components';

interface ProviderFormState {
	readonly id: string;
	readonly name: string;
	readonly baseUrl: string;
	readonly apiKey: string;
}

const emptyForm: ProviderFormState = {
	id: '',
	name: '',
	baseUrl: '',
	apiKey: '',
};

function toProviderInput(form: ProviderFormState): ProviderInput {
	return {
		id: form.id.trim().toLowerCase(),
		name: form.name.trim(),
		baseUrl: form.baseUrl.trim(),
		apiKey: form.apiKey.trim(),
	};
}

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});
	const [form, setForm] = useState<ProviderFormState>(emptyForm);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadProviders = async (): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const nextProviders = await window.app.getProviders();
			const statusEntries = await Promise.all(
				nextProviders.map(
					async (provider) =>
						[provider.id, await window.app.isProviderApiKeySaved(provider.id)] as const
				)
			);
			setProviders(nextProviders);
			setApiKeyStatus(Object.fromEntries(statusEntries));
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadProviders();
	}, []);

	const updateForm = (key: keyof ProviderFormState, value: string): void => {
		setForm((current) => ({ ...current, [key]: value }));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await window.app.addProvider(toProviderInput(form));
			setForm(emptyForm);
			setShowForm(false);
			await loadProviders();
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : String(saveError));
		} finally {
			setSaving(false);
		}
	};

	const canSubmit =
		form.id.trim().length > 0 &&
		form.name.trim().length > 0 &&
		form.baseUrl.trim().length > 0 &&
		form.apiKey.trim().length > 0 &&
		!saving;

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				icon={Server}
				title={t('settings.tabs.providers')}
				description={t('settings.providers.description')}
				action={
					<Button type="button" size="sm" onClick={() => setShowForm(true)}>
						<Plus className="size-4" />
						{t('settings.providers.addProvider')}
					</Button>
				}
			/>

			{error && (
				<SettingsNotice icon={AlertTriangle} variant="destructive">
					{error}
				</SettingsNotice>
			)}

			{showForm && (
				<SettingsSection
					title={t('settings.providers.addTitle')}
					description={t('settings.providers.addDescription')}
				>
					<SettingsPanel>
						<form className="grid gap-3 p-3 md:grid-cols-2" onSubmit={handleSubmit}>
							<label className="flex flex-col gap-1.5 text-sm font-medium">
								{t('settings.providers.id')}
								<Input
									value={form.id}
									onChange={(event) => updateForm('id', event.target.value)}
									placeholder={t('settings.providers.idPlaceholder')}
									autoComplete="off"
								/>
							</label>

							<label className="flex flex-col gap-1.5 text-sm font-medium">
								{t('settings.providers.name')}
								<Input
									value={form.name}
									onChange={(event) => updateForm('name', event.target.value)}
									placeholder={t('settings.providers.namePlaceholder')}
									autoComplete="off"
								/>
							</label>

							<label className="flex flex-col gap-1.5 text-sm font-medium md:col-span-2">
								{t('settings.providers.baseUrl')}
								<Input
									value={form.baseUrl}
									onChange={(event) => updateForm('baseUrl', event.target.value)}
									placeholder={t('settings.providers.baseUrlPlaceholder')}
									type="url"
									autoComplete="off"
								/>
							</label>

							<label className="flex flex-col gap-1.5 text-sm font-medium md:col-span-2">
								{t('providers.apiKey')}
								<Input
									value={form.apiKey}
									onChange={(event) => updateForm('apiKey', event.target.value)}
									placeholder={t('settings.providers.apiKeyPlaceholder')}
									type="password"
									autoComplete="off"
								/>
							</label>

							<div className="flex flex-wrap justify-end gap-2 md:col-span-2">
								<Button
									type="button"
									variant="outline"
									disabled={saving}
									onClick={() => {
										setForm(emptyForm);
										setShowForm(false);
									}}
								>
									{t('common.cancel')}
								</Button>
								<Button type="submit" disabled={!canSubmit}>
									{saving ? t('settings.providers.saving') : t('settings.providers.addProvider')}
								</Button>
							</div>
						</form>
					</SettingsPanel>
				</SettingsSection>
			)}

			<SettingsSection title={t('settings.providers.registeredProviders')}>
				{loading ? (
					<SettingsPanel>
						<div className="grid gap-2.5 p-3">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-5/6" />
						</div>
					</SettingsPanel>
				) : providers.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Server}
							title={t('settings.providers.noProviders')}
							description={t('settings.providers.description')}
						/>
					</SettingsPanel>
				) : (
					<SettingsPanel>
						{providers.map((provider) => (
							<SettingsRow
								key={provider.id}
								icon={Server}
								title={
									<span className="flex min-w-0 flex-wrap items-center gap-2">
										<span className="truncate">{provider.name}</span>
										<Badge variant="outline" className="font-mono text-[11px]">
											{provider.id}
										</Badge>
									</span>
								}
								description={
									<span className="block truncate font-mono text-xs">{provider.baseUrl}</span>
								}
							>
								<Badge variant={apiKeyStatus[provider.id] ? 'secondary' : 'outline'}>
									{apiKeyStatus[provider.id] ? (
										<CheckCircle2 className="mr-1 size-3" />
									) : (
										<KeyRound className="mr-1 size-3" />
									)}
									{apiKeyStatus[provider.id]
										? t('settings.providers.keySaved')
										: t('settings.providers.keyMissing')}
								</Badge>
							</SettingsRow>
						))}
					</SettingsPanel>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ProvidersPage;
