import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Save } from 'lucide-react';
import {
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
} from '../../../../../../../shared/provider_models_definitions';
import { getProviderCatalogItem } from '../../../../start/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';

type HealthSettings = Awaited<ReturnType<typeof window.agent.healthGetSettings>>;

const EVERY_OPTIONS: readonly HealthSettings['every'][] = ['0m', '1m', '30m', '1h'];

const SWITCH_FIELDS = [
	'lightContext',
	'isolatedSession',
	'skipWhenBusy',
	'includeReasoning',
] as const;

const PROVIDER_GROUPS = LLM_PROVIDERS.map((id) => ({
	id,
	models: LLM_MODELS_BY_PROVIDER[id] ?? [],
})).filter((group) => group.models.length > 0);

const HealthPage: React.FC = () => {
	const { t } = useTranslation();
	const [settings, setSettings] = useState<HealthSettings | null>(null);
	const [checklist, setChecklist] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		let mounted = true;
		void Promise.all([window.agent.healthGetSettings(), window.agent.healthGetData()])
			.then(([result, data]) => {
				if (!mounted) return;
				setSettings(result);
				setChecklist(data);
			})
			.catch((err: unknown) => {
				if (mounted) setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	const update = (patch: Partial<HealthSettings>): void => {
		setSettings((current) => (current ? { ...current, ...patch } : current));
		setSaved(false);
	};

	const handleSave = async (): Promise<void> => {
		if (!settings) return;
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			const activeHours =
				settings.activeHours?.start && settings.activeHours?.end
					? settings.activeHours
					: undefined;
			await window.agent.healthSaveSettings({ ...settings, activeHours });
			await window.agent.healthSaveData(checklist);
			setSaved(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : t('settings.health.errors.saveFailed'));
		} finally {
			setSaving(false);
		}
	};

	const targetOptions =
		settings && settings.target !== 'none' && settings.target !== 'last'
			? (['none', 'last', settings.target] as const)
			: (['none', 'last'] as const);

	const selectedGroup = PROVIDER_GROUPS.find((group) => group.id === settings?.providerId);

	const handleProviderChange = (value: string | null): void => {
		const group = PROVIDER_GROUPS.find((item) => item.id === (value ?? ''));
		update({ providerId: group?.id, modelId: group?.models[0]?.id });
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.health')}
				description={t('settings.overview.descriptions.health')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{loading || !settings ? (
				<SettingsLoadingRows rows={3} />
			) : (
				<>
					<SettingsSection
						title={t('settings.health.settingsTitle')}
						description={t('settings.health.settingsDescription')}
					>
						<div className="grid gap-3">
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField id="health-provider" label={t('settings.health.fields.provider')}>
									<Select
										value={settings.providerId ?? ''}
										onValueChange={handleProviderChange}
										disabled={saving}
									>
										<SelectTrigger id="health-provider" className="w-full text-xs">
											<SelectValue
												placeholder={t('settings.health.fields.providerPlaceholder')}
											/>
										</SelectTrigger>
										<SelectContent>
											{PROVIDER_GROUPS.map((group) => (
												<SelectItem key={group.id} value={group.id}>
													{getProviderCatalogItem(group.id).name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField id="health-model" label={t('settings.health.fields.model')}>
									<Select
										value={settings.modelId ?? ''}
										onValueChange={(value) => update({ modelId: value ?? undefined })}
										disabled={saving || !selectedGroup || selectedGroup.models.length === 0}
									>
										<SelectTrigger id="health-model" className="w-full text-xs">
											<SelectValue placeholder={t('settings.health.fields.modelPlaceholder')} />
										</SelectTrigger>
										<SelectContent>
											{selectedGroup?.models.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name || model.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>
							</div>

							<div className="grid gap-3 sm:grid-cols-3">
								<SettingsField id="health-every" label={t('settings.health.fields.every')}>
									<Select
										value={settings.every}
										onValueChange={(value) =>
											update({ every: (value ?? '0m') as HealthSettings['every'] })
										}
										disabled={saving}
									>
										<SelectTrigger id="health-every" className="w-full text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{EVERY_OPTIONS.map((option) => (
												<SelectItem key={option} value={option}>
													{option === '0m' ? t('settings.health.fields.everyOff') : option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField id="health-target" label={t('settings.health.fields.target')}>
									<Select
										value={settings.target}
										onValueChange={(value) => update({ target: value ?? 'none' })}
										disabled={saving}
									>
										<SelectTrigger id="health-target" className="w-full text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{targetOptions.map((option) => (
												<SelectItem key={option} value={option}>
													{option === 'none'
														? t('settings.health.fields.targetNone')
														: option === 'last'
															? t('settings.health.fields.targetLast')
															: option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField
									id="health-direct-policy"
									label={t('settings.health.fields.directPolicy')}
								>
									<Select
										value={settings.directPolicy}
										onValueChange={(value) =>
											update({
												directPolicy: (value ?? 'allow') as HealthSettings['directPolicy'],
											})
										}
										disabled={saving}
									>
										<SelectTrigger id="health-direct-policy" className="w-full text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="allow">
												{t('settings.health.fields.directAllow')}
											</SelectItem>
											<SelectItem value="block">
												{t('settings.health.fields.directBlock')}
											</SelectItem>
										</SelectContent>
									</Select>
								</SettingsField>
							</div>

							<SettingsPanel>
								<Item
									variant="outline"
									size="md"
									className="border-b border-border/60 last:border-b-0"
								>
									<ItemContent className="min-w-0 flex-1">
										<ItemTitle className="max-w-full truncate">
											{t('settings.health.fields.activeHoursStart')}
										</ItemTitle>
									</ItemContent>
									<ItemActions className="ml-auto flex-none justify-end">
										<Input
											id="health-active-start"
											type="date"
											className="h-7 w-36 text-xs"
											value={settings.activeHours?.start ?? ''}
											onChange={(event) =>
												update({
													activeHours: {
														start: event.target.value,
														end: settings.activeHours?.end ?? '',
													},
												})
											}
											disabled={saving}
											aria-label={t('settings.health.fields.activeHoursStart')}
										/>
									</ItemActions>
								</Item>

								<Item
									variant="outline"
									size="md"
									className="border-b border-border/60 last:border-b-0"
								>
									<ItemContent className="min-w-0 flex-1">
										<ItemTitle className="max-w-full truncate">
											{t('settings.health.fields.activeHoursEnd')}
										</ItemTitle>
									</ItemContent>
									<ItemActions className="ml-auto flex-none justify-end">
										<Input
											id="health-active-end"
											type="date"
											className="h-7 w-36 text-xs"
											value={settings.activeHours?.end ?? ''}
											onChange={(event) =>
												update({
													activeHours: {
														start: settings.activeHours?.start ?? '',
														end: event.target.value,
													},
												})
											}
											disabled={saving}
											aria-label={t('settings.health.fields.activeHoursEnd')}
										/>
									</ItemActions>
								</Item>

								{SWITCH_FIELDS.map((field) => (
									<Item
										key={field}
										variant="outline"
										size="md"
										className="border-b border-border/60 last:border-b-0"
									>
										<ItemContent className="min-w-0 flex-1">
											<ItemTitle className="max-w-full truncate">
												{t(`settings.health.fields.${field}`)}
											</ItemTitle>
										</ItemContent>
										<ItemActions className="ml-auto flex-none justify-end">
											<Switch
												checked={Boolean(settings[field])}
												onCheckedChange={(checked) =>
													update({ [field]: checked } as Partial<HealthSettings>)
												}
												disabled={saving}
												aria-label={t(`settings.health.fields.${field}`)}
											/>
										</ItemActions>
									</Item>
								))}
							</SettingsPanel>
						</div>
					</SettingsSection>

					<SettingsSection
						title={t('settings.health.checklistTitle')}
						description={t('settings.health.checklistDescription')}
					>
						<Textarea
							value={checklist}
							onChange={(event) => {
								setChecklist(event.target.value);
								setSaved(false);
							}}
							rows={10}
							spellCheck={false}
							className="font-mono text-xs"
							disabled={saving}
							aria-label={t('settings.health.checklistTitle')}
						/>
					</SettingsSection>

					{saved && (
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.health.saved')}
						</p>
					)}

					<div className="flex justify-end">
						<Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
							{saving ? (
								<LoaderCircle className="size-3 animate-spin" />
							) : (
								<Save className="size-3" />
							)}
							{saving ? t('settings.health.saving') : t('common.save')}
						</Button>
					</div>
				</>
			)}
		</SettingsPageShell>
	);
};

export default HealthPage;
