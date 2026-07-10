import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Save, Sparkles } from 'lucide-react';
import {
	MUSIC_PROVIDER_IDS,
	TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
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

const MUSIC_PROVIDER_GROUPS: readonly ModelProviderGroup[] = MUSIC_PROVIDER_IDS.map((id) => ({
	id,
	models: TEXT_TO_AUDIO_MODELS_BY_PROVIDER[id] ?? [],
})).filter((group) => group.models.length > 0);

const MusicPage: React.FC = () => {
	const { t } = useTranslation();
	const [providerId, setProviderId] = useState('');
	const [modelId, setModelId] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [prompt, setPrompt] = useState('');
	const [generating, setGenerating] = useState(false);
	const [audioSrc, setAudioSrc] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void (async () => {
			try {
				const [storedProviderId, storedModelId] = await Promise.all([
					window.sound.getProviderId(),
					window.sound.getModelId(),
				]);
				if (!mounted) return;
				const nextProviderId =
					storedProviderId &&
					MUSIC_PROVIDER_GROUPS.some((group) => group.id === storedProviderId)
						? storedProviderId
						: (MUSIC_PROVIDER_GROUPS[0]?.id ?? '');
				const models =
					MUSIC_PROVIDER_GROUPS.find((group) => group.id === nextProviderId)?.models ?? [];
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

	const handleProviderChange = (nextProviderId: string): void => {
		setProviderId(nextProviderId);
		setModelId(firstModelIdForProvider(MUSIC_PROVIDER_GROUPS, nextProviderId));
		setSaved(false);
		setError(null);
	};

	const handleModelChange = (nextModelId: string): void => {
		setModelId(nextModelId);
		setSaved(false);
		setError(null);
	};

	const handleSave = async (): Promise<void> => {
		if (!providerId || !modelId) return;
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			await window.music.setProviderId(providerId);
			await window.music.setModelId(modelId);
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
			const result = await window.music.createMusic({ prompt, providerId, modelId });
			setAudioSrc(`data:${result.mimeType};base64,${result.base64}`);
		} catch (err) {
			setError(
				err instanceof Error && err.message.trim()
					? err.message
					: t('settings.music.generateError')
			);
		} finally {
			setGenerating(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.modelServices.musicCreatorName')}
				description={t('settings.modelServices.musicCreatorDescription')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.modelServices.configuration')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<ModelProviderSelect
							idPrefix="music"
							providerGroups={MUSIC_PROVIDER_GROUPS}
							providerId={providerId}
							modelId={modelId}
							onProviderChange={handleProviderChange}
							onModelChange={handleModelChange}
							disabled={loading || saving}
							showFieldDescriptions
						/>

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

			<SettingsSection title={t('settings.music.prompt')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<SettingsField
							id="music-prompt"
							label={t('settings.music.prompt')}
							description={t('settings.music.promptDescription')}
						>
							<Textarea
								id="music-prompt"
								value={prompt}
								placeholder={t('settings.music.promptPlaceholder')}
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
								{generating ? t('settings.music.generating') : t('settings.music.generate')}
							</Button>
						</div>

						{audioSrc && (
							<audio controls src={audioSrc} className="w-full">
								{t('settings.music.resultFallback')}
							</audio>
						)}
					</div>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default MusicPage;
