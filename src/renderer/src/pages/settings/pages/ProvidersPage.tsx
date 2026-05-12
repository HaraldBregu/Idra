import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Plus, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { ProviderInput, PublicProvider } from '../../../../../shared/providers';

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
				nextProviders.map(async (provider) => [
					provider.id,
					await window.app.isProviderApiKeySaved(provider.id),
				] as const)
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
		<div className="flex w-full flex-col gap-5 p-6">
			<section>
				<div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
					<div>
						<h2 className="text-sm font-semibold text-muted-foreground">
							{t('settings.providers.title')}
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{t('settings.providers.description')}
						</p>
					</div>
					<Button type="button" size="sm" onClick={() => setShowForm(true)}>
						<Plus className="size-4" />
						{t('settings.providers.addProvider')}
					</Button>
				</div>

				{error && (
					<div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
						<span>{error}</span>
					</div>
				)}

				{showForm && (
					<Card className="gap-0 py-0">
						<CardHeader className="border-b border-border/70 py-4">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
									<Plus className="size-4 text-foreground" />
								</div>
								<div className="min-w-0">
									<CardTitle>{t('settings.providers.addTitle')}</CardTitle>
									<CardDescription className="mt-1">
										{t('settings.providers.addDescription')}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-4">
							<form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
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

								<div className="flex justify-end gap-2 md:col-span-2">
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
						</CardContent>
					</Card>
				)}
			</section>

			<section>
				<h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.providers.registeredProviders')}
				</h2>

				{loading ? (
					<Card className="gap-0 py-0">
						<CardContent className="p-6 text-sm text-muted-foreground">
							{t('settings.providers.loading')}
						</CardContent>
					</Card>
				) : providers.length === 0 ? (
					<Card className="gap-0 py-0">
						<CardContent className="p-6 text-sm text-muted-foreground">
							{t('settings.providers.noProviders')}
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-3">
						{providers.map((provider) => (
							<Card key={provider.id} className="gap-0 py-0">
								<CardContent className="flex flex-wrap items-center gap-3 p-4">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
										<Server className="size-4 text-foreground" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="text-sm font-semibold">{provider.name}</h3>
											<Badge variant="outline" className="font-mono text-[11px]">
												{provider.id}
											</Badge>
										</div>
										<p className="mt-1 truncate font-mono text-xs text-muted-foreground">
											{provider.baseUrl}
										</p>
									</div>
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
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</section>
		</div>
	);
};

export default ProvidersPage;
