import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Sparkles } from 'lucide-react';
import {
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_PROVIDER_IDS,
} from '../../../../../../shared/provider_models_definitions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
	firstModelIdForProvider,
	type ModelProviderGroup,
	ModelProviderSelect,
} from '@/components/model-provider-select';
import {
	SettingsField,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const IMAGE_PROVIDER_GROUPS: readonly ModelProviderGroup[] = TEXT_TO_IMAGE_PROVIDER_IDS.map(
	(id) => ({
		id,
		models: TEXT_TO_IMAGE_MODELS_BY_PROVIDER[id] ?? [],
	})
).filter((group) => group.models.length > 0);

const ImagePage: React.FC = () => {
	const { t } = useTranslation();
	const [providerId, setProviderId] = useState('');
	const [modelId, setModelId] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [prompt, setPrompt] = useState('');
	const [generating, setGenerating] = useState(false);
	const [imageSrc, setImageSrc] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void (async () => {
			try {
				const [storedProviderId, storedModelId] = await Promise.all([
					window.image.getProviderId(),
					window.image.getModelId(),
				]);
				if (!mounted) return;
				const nextProviderId =
					storedProviderId &&
					IMAGE_PROVIDER_GROUPS.some((group) => group.id === storedProviderId)
						? storedProviderId
						: (IMAGE_PROVIDER_GROUPS[0]?.id ?? '');
				const models =
					IMAGE_PROVIDER_GROUPS.find((group) => group.id === nextProviderId)?.models ?? [];
				setProviderId(nextProviderId);
				setModelId(
					storedModelId && models.some((model) => model.id === storedModelId)
						? storedModelId
						: (models[0]?.id ?? '')
				);
			} catch (err) {
				if (mounted) setError(err instanceof Error ? err.message : String(err));
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	const models = modelsFor(providerId);

	const handleProviderChange = (nextProviderId: string | null): void => {
		const id = nextProviderId ?? '';
		setProviderId(id);
		setModelId(modelsFor(id)[0]?.id ?? '');
		setSaved(false);
		setError(null);
	};

	const handleSave = async (): Promise<void> => {
		if (!providerId || !modelId) return;
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			await window.image.setProviderId(providerId);
			await window.image.setModelId(modelId);
			setSaved(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const handleGenerate = async (): Promise<void> => {
		if (!prompt.trim() || !providerId || !modelId) return;
		setGenerating(true);
		setError(null);
		try {
			const result = await window.image.createImage({ prompt, providerId, modelId });
			setImageSrc(`data:${result.mimeType};base64,${result.base64}`);
		} catch (err) {
			setError(
				err instanceof Error && err.message.trim()
					? err.message
					: t('settings.image.generateError')
			);
		} finally {
			setGenerating(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.modelServices.imageAssistantName')}
				description={t('settings.modelServices.imageAssistantDescription')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.modelServices.configuration')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<div className="grid gap-3 sm:grid-cols-2">
							<SettingsField
								id="image-provider"
								label={t('settings.modelServices.provider')}
								description={t('settings.modelServices.providerDescription')}
							>
								<Select
									value={providerId}
									onValueChange={handleProviderChange}
									disabled={loading || saving}
								>
									<SelectTrigger id="image-provider" className="w-full text-xs">
										<SelectValue placeholder={t('settings.modelServices.providerPlaceholder')} />
									</SelectTrigger>
									<SelectContent>
										{TEXT_TO_IMAGE_PROVIDER_IDS.map((id) => (
											<SelectItem key={id} value={id}>
												{getProviderCatalogItem(id).name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</SettingsField>

							<SettingsField
								id="image-model"
								label={t('settings.modelServices.model')}
								description={t('settings.modelServices.modelDescription')}
							>
								<Select
									value={modelId}
									onValueChange={(nextModelId) => {
										setModelId(nextModelId ?? '');
										setSaved(false);
										setError(null);
									}}
									disabled={loading || saving || models.length === 0}
								>
									<SelectTrigger id="image-model" className="w-full text-xs">
										<SelectValue placeholder={t('settings.modelServices.modelPlaceholder')} />
									</SelectTrigger>
									<SelectContent>
										{models.map((model) => (
											<SelectItem key={model.id} value={model.id}>
												{model.name || model.id}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</SettingsField>
						</div>

						{saved && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.modelServices.saved')}
							</p>
						)}

						<div className="flex justify-end">
							<Button
								type="button"
								size="sm"
								disabled={loading || saving || !providerId || !modelId}
								onClick={() => void handleSave()}
							>
								{saving ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Save className="size-3" />
								)}
								{saving ? t('settings.modelServices.saving') : t('common.save')}
							</Button>
						</div>
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.image.prompt')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<SettingsField
							id="image-prompt"
							label={t('settings.image.prompt')}
							description={t('settings.image.promptDescription')}
						>
							<Textarea
								id="image-prompt"
								value={prompt}
								placeholder={t('settings.image.promptPlaceholder')}
								disabled={generating}
								onChange={(event) => setPrompt(event.target.value)}
							/>
						</SettingsField>

						<div className="flex justify-end">
							<Button
								type="button"
								size="sm"
								disabled={generating || loading || !prompt.trim() || !providerId || !modelId}
								onClick={() => void handleGenerate()}
							>
								{generating ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Sparkles className="size-3" />
								)}
								{generating ? t('settings.image.generating') : t('settings.image.generate')}
							</Button>
						</div>

						{imageSrc && (
							<img
								src={imageSrc}
								alt={t('settings.image.resultAlt')}
								className="w-full rounded-lg border border-border/70"
							/>
						)}
					</div>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ImagePage;
