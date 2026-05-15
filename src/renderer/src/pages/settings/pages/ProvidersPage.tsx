import React, { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Plus, Server, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProviderInput, PublicProvider } from '../../../../../shared/providers';

function Row({
	icon: Icon,
	title,
	description,
	children,
}: {
	readonly icon?: LucideIcon;
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly children?: ReactNode;
}): React.JSX.Element {
	return (
		<div className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2 last:border-b-0">
			<div className="flex min-w-0 items-start gap-2">
				{Icon && (
					<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
						<Icon className="size-3.5" />
					</div>
				)}
				<div className="min-w-0 flex-1">
					<div className="text-[13px] font-medium leading-tight text-foreground">{title}</div>
					{description && (
						<p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{children && (
				<div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">{children}</div>
			)}
		</div>
	);
}

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
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-3">
			<header className="flex flex-wrap items-start justify-between gap-3 pb-1">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-tight tracking-normal">
						{t('settings.tabs.providers')}
					</h1>
					<p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
						{t('settings.providers.description')}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button type="button" size="xs" onClick={() => setShowForm(true)}>
						<Plus className="size-3" />
						{t('settings.providers.addProvider')}
					</Button>
				</div>
			</header>

			{error && (
				<div className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
					<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
					<span className="min-w-0">{error}</span>
				</div>
			)}

			{showForm && (
				<section className="flex flex-col gap-2">
					<div className="px-0.5">
						<h2 className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
							{t('settings.providers.addTitle')}
						</h2>
						<p className="mt-0.5 max-w-2xl text-xs leading-snug text-muted-foreground">
							{t('settings.providers.addDescription')}
						</p>
					</div>
					<Card size="sm" className="gap-0 py-0">
						<CardContent className="p-0">
							<form className="grid gap-2.5 p-2.5 md:grid-cols-2" onSubmit={handleSubmit}>
								<label className="flex flex-col gap-1 text-xs font-medium">
									{t('settings.providers.id')}
									<Input
										value={form.id}
										onChange={(event) => updateForm('id', event.target.value)}
										placeholder={t('settings.providers.idPlaceholder')}
										autoComplete="off"
										className="h-8 px-2.5 text-xs md:text-xs"
									/>
								</label>

								<label className="flex flex-col gap-1 text-xs font-medium">
									{t('settings.providers.name')}
									<Input
										value={form.name}
										onChange={(event) => updateForm('name', event.target.value)}
										placeholder={t('settings.providers.namePlaceholder')}
										autoComplete="off"
										className="h-8 px-2.5 text-xs md:text-xs"
									/>
								</label>

								<label className="flex flex-col gap-1 text-xs font-medium md:col-span-2">
									{t('settings.providers.baseUrl')}
									<Input
										value={form.baseUrl}
										onChange={(event) => updateForm('baseUrl', event.target.value)}
										placeholder={t('settings.providers.baseUrlPlaceholder')}
										type="url"
										autoComplete="off"
										className="h-8 px-2.5 text-xs md:text-xs"
									/>
								</label>

								<label className="flex flex-col gap-1 text-xs font-medium md:col-span-2">
									{t('providers.apiKey')}
									<Input
										value={form.apiKey}
										onChange={(event) => updateForm('apiKey', event.target.value)}
										placeholder={t('settings.providers.apiKeyPlaceholder')}
										type="password"
										autoComplete="off"
										className="h-8 px-2.5 text-xs md:text-xs"
									/>
								</label>

								<div className="flex flex-wrap justify-end gap-1.5 md:col-span-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={saving}
										onClick={() => {
											setForm(emptyForm);
											setShowForm(false);
										}}
									>
										{t('common.cancel')}
									</Button>
									<Button type="submit" size="sm" disabled={!canSubmit}>
										{saving
											? t('settings.providers.saving')
											: t('settings.providers.addProvider')}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</section>
			)}

			<section className="flex flex-col gap-2">
				<h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
					{t('settings.providers.registeredProviders')}
				</h2>
				<Card size="sm" className="gap-0 py-0">
					<CardContent className="p-0">
						{loading ? (
							<div className="grid gap-2 p-2.5">
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-5/6" />
							</div>
						) : providers.length === 0 ? (
							<Empty className="min-h-28 gap-3 border-0 p-4">
								<EmptyHeader className="gap-1.5">
									<EmptyMedia variant="icon" className="mb-1 size-7">
										<Server className="size-3.5" />
									</EmptyMedia>
									<EmptyTitle className="text-[13px]">
										{t('settings.providers.noProviders')}
									</EmptyTitle>
									<EmptyDescription className="text-xs leading-snug">
										{t('settings.providers.description')}
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						) : (
							providers.map((provider) => (
								<Row
									key={provider.id}
									icon={Server}
									title={
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{provider.name}</span>
											<Badge variant="outline" className="font-mono text-[10px]">
												{provider.id}
											</Badge>
										</span>
									}
									description={
										<span className="block truncate font-mono text-[11px]">
											{provider.baseUrl}
										</span>
									}
								>
									<Badge
										variant={apiKeyStatus[provider.id] ? 'secondary' : 'outline'}
										className="text-[10px]"
									>
										{apiKeyStatus[provider.id] ? (
											<CheckCircle2 className="mr-1 size-3" />
										) : (
											<KeyRound className="mr-1 size-3" />
										)}
										{apiKeyStatus[provider.id]
											? t('settings.providers.keySaved')
											: t('settings.providers.keyMissing')}
									</Badge>
								</Row>
							))
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default ProvidersPage;
