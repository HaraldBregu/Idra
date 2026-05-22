import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
	AlertTriangle,
	Bot,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	CircleOff,
	ImageIcon,
	LoaderCircle,
	Mic,
	Music,
	Save,
	Video,
	Volume2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../../../../../../shared/providers';
import {
	ASSISTANT_OPERATOR_ID,
	ASSISTANT_RUNTIME_ID,
	DEFAULT_MODEL_REASONING_EFFORT,
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	OPERATOR_DEFINITIONS,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_VIDEO_OPERATOR_ID,
	getDefaultModelReasoningEffort,
	getModelReasoningEfforts,
	isModelReasoningEffortSupported,
	supportsModelReasoningEffortProvider,
	type ConfiguredModelOperator,
	type Model,
	type ModelReasoningEffort,
} from '../../../../../../../shared/agents/service';
import {
	IMAGE_CREATOR_MODELS,
	MUSIC_CREATOR_MODELS,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_ID,
	TEXT_TO_VIDEO_MODELS,
} from '../../../../../../../shared/providers';

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

function effortForModel(
	modelId: string,
	value: unknown,
	providerId?: string
): ModelReasoningEffort {
	return isModelReasoningEffortSupported(modelId, value, providerId)
		? value
		: getDefaultModelReasoningEffort(modelId, providerId);
}

function storedEffortForComparison(
	model: Model,
	providerId: string
): ModelReasoningEffort | undefined {
	if (model.effort === undefined) return getDefaultModelReasoningEffort(model.id, providerId);
	return isModelReasoningEffortSupported(model.id, model.effort, providerId)
		? model.effort
		: undefined;
}

function mergeProviders(
	providers: readonly PublicProvider[],
	operator: ConfiguredModelOperator | undefined
): PublicProvider[] {
	const byId = new Map(providers.map((provider) => [provider.id, provider]));
	if (operator && !byId.has(operator.provider.id)) {
		byId.set(operator.provider.id, operator.provider);
	}
	return [...byId.values()];
}

const OperatorDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { operatorId } = useParams<{ operatorId: string }>();
	const decodedOperatorId = decodeURIComponent(operatorId ?? '');
	const isAssistantOperator =
		decodedOperatorId === ASSISTANT_OPERATOR_ID || decodedOperatorId === ASSISTANT_RUNTIME_ID;
	const isSpeechToTextOperator = decodedOperatorId === SPEECH_TO_TEXT_OPERATOR_ID;
	const isTextToSpeechOperator = decodedOperatorId === TEXT_TO_SPEECH_OPERATOR_ID;
	const isImageCreatorOperator = decodedOperatorId === IMAGE_CREATOR_OPERATOR_ID;
	const isVideoCreatorOperator = decodedOperatorId === TEXT_TO_VIDEO_OPERATOR_ID;
	const isMusicCreatorOperator = decodedOperatorId === MUSIC_CREATOR_OPERATOR_ID;
	const isCapabilityOperator =
		isSpeechToTextOperator ||
		isTextToSpeechOperator ||
		isImageCreatorOperator ||
		isVideoCreatorOperator ||
		isMusicCreatorOperator;
	const isRuntimeBackedOperator = isAssistantOperator || isCapabilityOperator;
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [currentAssistantOperator, setCurrentAssistantOperator] = useState<
		ConfiguredModelOperator | undefined
	>();
	const [currentSpeechToTextOperator, setCurrentSpeechToTextOperator] = useState<
		ConfiguredModelOperator | undefined
	>();
	const [currentTextToSpeechOperator, setCurrentTextToSpeechOperator] = useState<
		ConfiguredModelOperator | undefined
	>();
	const [currentImageCreatorOperator, setCurrentImageCreatorOperator] = useState<
		ConfiguredModelOperator | undefined
	>();
	const [currentTextToVideoOperator, setCurrentTextToVideoOperator] = useState<
		ConfiguredModelOperator | undefined
	>();
	const [currentMusicCreatorOperator, setCurrentMusicCreatorOperator] = useState<
		ConfiguredModelOperator | undefined
	>();
	const [providerId, setProviderId] = useState('');
	const [models, setModels] = useState<Model[]>([]);
	const [modelId, setModelId] = useState('');
	const [effort, setEffort] = useState<ModelReasoningEffort>(DEFAULT_MODEL_REASONING_EFFORT);
	const [loading, setLoading] = useState(true);
	const [loadingModels, setLoadingModels] = useState(false);
	const [saving, setSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [providerCardOpen, setProviderCardOpen] = useState(false);

	useEffect(() => {
		let mounted = true;

		if (!isRuntimeBackedOperator) {
			setLoading(false);
			setErrorMessage('');
			setSuccessMessage('');
			return () => {
				mounted = false;
			};
		}

		setLoading(true);
		setErrorMessage('');
		setSuccessMessage('');

		const operatorRequest = isSpeechToTextOperator
			? window.app.getSpeechToTextOperator()
			: isTextToSpeechOperator
				? window.app.getTextToSpeechOperator()
				: isImageCreatorOperator
					? window.app.getImageCreatorOperator()
					: isVideoCreatorOperator
						? window.app.getTextToVideoOperator()
						: isMusicCreatorOperator
							? window.app.getMusicCreatorOperator()
							: window.app.getAssistantOperator();

		void Promise.all([window.app.getProviders(), operatorRequest])
			.then(async ([nextProviders, nextOperator]) => {
				if (!mounted) return;
				const mergedProviders = mergeProviders(nextProviders, nextOperator);
				const capabilityModelsByProvider = new Map<string, Model[]>();
				let availableProviders = mergedProviders;
				if (isCapabilityOperator) {
					const providersWithCapabilityModels: PublicProvider[] = [];
					for (const provider of mergedProviders) {
						const nextModels = isImageCreatorOperator
							? await window.app.getImageCreatorModels(provider).catch(() => [])
							: isTextToSpeechOperator
								? await window.app.getTextToSpeechModels(provider).catch(() => [])
								: isVideoCreatorOperator
									? await window.app.getTextToVideoModels(provider).catch(() => [])
									: isMusicCreatorOperator
										? await window.app.getMusicCreatorModels(provider).catch(() => [])
										: await window.app.getSpeechToTextModels(provider).catch(() => []);
						if (nextModels.length > 0 || provider.id === nextOperator?.provider.id) {
							providersWithCapabilityModels.push(provider);
							capabilityModelsByProvider.set(provider.id, nextModels);
						}
					}
					availableProviders = providersWithCapabilityModels;
				}
				const preferredProvider =
					availableProviders.find((provider) => provider.id === nextOperator?.provider.id) ??
					availableProviders[0];
				const preferredCapabilityModels = preferredProvider
					? (capabilityModelsByProvider.get(preferredProvider.id) ?? [])
					: [];
				const preferredCapabilityModelId =
					nextOperator &&
					preferredProvider?.id === nextOperator.provider.id &&
					preferredCapabilityModels.some((model) => model.id === nextOperator.model.id)
						? nextOperator.model.id
						: (preferredCapabilityModels[0]?.id ?? '');

				setProviders(availableProviders);
				setCurrentAssistantOperator(isAssistantOperator ? nextOperator : undefined);
				setCurrentSpeechToTextOperator(isSpeechToTextOperator ? nextOperator : undefined);
				setCurrentTextToSpeechOperator(isTextToSpeechOperator ? nextOperator : undefined);
				setCurrentImageCreatorOperator(isImageCreatorOperator ? nextOperator : undefined);
				setCurrentTextToVideoOperator(isVideoCreatorOperator ? nextOperator : undefined);
				setCurrentMusicCreatorOperator(isMusicCreatorOperator ? nextOperator : undefined);
				setProviderId(preferredProvider?.id ?? '');
				setModelId(
					nextOperator && preferredProvider?.id === nextOperator.provider.id
						? isCapabilityOperator
							? preferredCapabilityModelId
							: nextOperator.model.id
						: isCapabilityOperator
							? preferredCapabilityModelId
							: ''
				);
				setEffort(
					nextOperator && preferredProvider?.id === nextOperator.provider.id && isAssistantOperator
						? effortForModel(nextOperator.model.id, nextOperator.model.effort, preferredProvider.id)
						: DEFAULT_MODEL_REASONING_EFFORT
				);
			})
			.catch((error) => {
				if (!mounted) return;
				setProviders([]);
				setCurrentAssistantOperator(undefined);
				setCurrentSpeechToTextOperator(undefined);
				setCurrentTextToSpeechOperator(undefined);
				setCurrentImageCreatorOperator(undefined);
				setCurrentTextToVideoOperator(undefined);
				setCurrentMusicCreatorOperator(undefined);
				setProviderId('');
				setModelId('');
				setEffort(DEFAULT_MODEL_REASONING_EFFORT);
				setErrorMessage(getErrorMessage(error, t('settings.operators.loadError')));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, [
		isAssistantOperator,
		isCapabilityOperator,
		isImageCreatorOperator,
		isRuntimeBackedOperator,
		isMusicCreatorOperator,
		isSpeechToTextOperator,
		isTextToSpeechOperator,
		isVideoCreatorOperator,
		t,
	]);

	const selectedProvider = providers.find((provider) => provider.id === providerId);

	useEffect(() => {
		let mounted = true;

		if (!selectedProvider) {
			setModels([]);
			setModelId('');
			return () => {
				mounted = false;
			};
		}

		if (isCapabilityOperator) {
			setLoadingModels(true);
			setErrorMessage('');
			const loadCapabilityModels = isImageCreatorOperator
				? window.app.getImageCreatorModels(selectedProvider)
				: isTextToSpeechOperator
					? window.app.getTextToSpeechModels(selectedProvider)
					: isVideoCreatorOperator
						? window.app.getTextToVideoModels(selectedProvider)
						: isMusicCreatorOperator
							? window.app.getMusicCreatorModels(selectedProvider)
							: window.app.getSpeechToTextModels(selectedProvider);
			void loadCapabilityModels
				.then((capabilityModels) => {
					if (!mounted) return;
					const currentOperator = isImageCreatorOperator
						? currentImageCreatorOperator
						: isTextToSpeechOperator
							? currentTextToSpeechOperator
							: isVideoCreatorOperator
								? currentTextToVideoOperator
								: isMusicCreatorOperator
									? currentMusicCreatorOperator
									: currentSpeechToTextOperator;
					setModels(capabilityModels);
					setModelId((current) => {
						if (current && capabilityModels.some((model) => model.id === current)) return current;
						if (
							currentOperator?.provider.id === selectedProvider.id &&
							capabilityModels.some((model) => model.id === currentOperator.model.id)
						) {
							return currentOperator.model.id;
						}
						return capabilityModels[0]?.id ?? '';
					});
				})
				.catch((error) => {
					if (!mounted) return;
					setModels([]);
					setModelId('');
					setErrorMessage(getErrorMessage(error, t('settings.operators.modelsLoadError')));
				})
				.finally(() => {
					if (mounted) setLoadingModels(false);
				});
			return () => {
				mounted = false;
			};
		}

		setLoadingModels(true);
		setErrorMessage('');

		void window.app
			.getModels(selectedProvider)
			.then((nextModels) => {
				if (!mounted) return;
				setModels(nextModels);
				setModelId((current) => {
					if (current && nextModels.some((model) => model.id === current)) return current;
					if (currentAssistantOperator?.provider.id === selectedProvider.id)
						return currentAssistantOperator.model.id;
					return nextModels[0]?.id ?? '';
				});
			})
			.catch((error) => {
				if (!mounted) return;
				setModels([]);
				setModelId('');
				setErrorMessage(getErrorMessage(error, t('settings.operators.modelsLoadError')));
			})
			.finally(() => {
				if (mounted) setLoadingModels(false);
			});

		return () => {
			mounted = false;
		};
	}, [
		currentAssistantOperator,
		currentImageCreatorOperator,
		currentMusicCreatorOperator,
		currentSpeechToTextOperator,
		currentTextToSpeechOperator,
		currentTextToVideoOperator,
		isCapabilityOperator,
		isImageCreatorOperator,
		isMusicCreatorOperator,
		isSpeechToTextOperator,
		isTextToSpeechOperator,
		isVideoCreatorOperator,
		selectedProvider,
		t,
	]);

	const currentCapabilityOperator = isImageCreatorOperator
		? currentImageCreatorOperator
		: isTextToSpeechOperator
			? currentTextToSpeechOperator
			: isVideoCreatorOperator
				? currentTextToVideoOperator
				: isMusicCreatorOperator
					? currentMusicCreatorOperator
					: currentSpeechToTextOperator;

	const modelOptions = useMemo(() => {
		const byId = new Map(models.map((model) => [model.id, model]));
		const currentModelOperator = isCapabilityOperator
			? currentCapabilityOperator
			: currentAssistantOperator;
		if (
			currentModelOperator?.provider.id === providerId &&
			currentModelOperator.model.id &&
			!byId.has(currentModelOperator.model.id)
		) {
			byId.set(currentModelOperator.model.id, currentModelOperator.model);
		}
		return [...byId.values()];
	}, [
		currentAssistantOperator,
		currentCapabilityOperator,
		isCapabilityOperator,
		models,
		providerId,
	]);

	const selectedModel = modelOptions.find((model) => model.id === modelId);
	const showEffort = isAssistantOperator && supportsModelReasoningEffortProvider(providerId);
	const effortOptions = useMemo(
		() => (showEffort ? getModelReasoningEfforts(modelId, providerId) : []),
		[modelId, providerId, showEffort]
	);
	const selectedEffort = showEffort ? effort : undefined;
	const currentEffort =
		currentAssistantOperator &&
		supportsModelReasoningEffortProvider(currentAssistantOperator.provider.id)
			? storedEffortForComparison(
					currentAssistantOperator.model,
					currentAssistantOperator.provider.id
				)
			: undefined;
	const hasChanges = isCapabilityOperator
		? !currentCapabilityOperator ||
			currentCapabilityOperator.provider.id !== providerId ||
			currentCapabilityOperator.model.id !== modelId
		: !currentAssistantOperator ||
			currentAssistantOperator.provider.id !== providerId ||
			currentAssistantOperator.model.id !== modelId ||
			currentEffort !== selectedEffort;
	const canSave = Boolean(
		selectedProvider && selectedModel && hasChanges && !loadingModels && !saving
	);

	const handleProviderChange = useCallback((nextValue: string | null): void => {
		setProviderId(nextValue ?? '');
		setModelId('');
		setEffort(DEFAULT_MODEL_REASONING_EFFORT);
		setSuccessMessage('');
	}, []);

	const handleModelChange = useCallback(
		(nextValue: string | null): void => {
			const nextModelId = nextValue ?? '';
			setModelId(nextModelId);
			setEffort((current) => effortForModel(nextModelId, current, providerId));
			setSuccessMessage('');
		},
		[providerId]
	);

	const handleEffortChange = useCallback(
		(nextValue: string | null): void => {
			setEffort(effortForModel(modelId, nextValue, providerId));
			setSuccessMessage('');
		},
		[modelId, providerId]
	);

	useEffect(() => {
		if (!showEffort) return;
		setEffort((current) => effortForModel(modelId, current, providerId));
	}, [modelId, providerId, showEffort]);

	const handleSave = useCallback(async (): Promise<void> => {
		if (!selectedProvider || !selectedModel || !canSave) return;

		setSaving(true);
		setErrorMessage('');
		setSuccessMessage('');
		try {
			if (isSpeechToTextOperator) {
				const modelToSave: Model = { id: selectedModel.id, name: selectedModel.name };
				const saved = await window.app.saveSpeechToTextOperator(selectedProvider, modelToSave);
				if (!saved) throw new Error(t('settings.operators.saveError'));
				setCurrentSpeechToTextOperator({
					...OPERATOR_DEFINITIONS.speechToText,
					provider: selectedProvider,
					model: modelToSave,
				});
				setSuccessMessage(t('settings.operators.saved'));
				return;
			}

			if (isTextToSpeechOperator) {
				const modelToSave: Model = { id: selectedModel.id, name: selectedModel.name };
				const saved = await window.app.saveTextToSpeechOperator(selectedProvider, modelToSave);
				if (!saved) throw new Error(t('settings.operators.saveError'));
				setCurrentTextToSpeechOperator({
					...OPERATOR_DEFINITIONS.textToSpeech,
					provider: selectedProvider,
					model: modelToSave,
				});
				setSuccessMessage(t('settings.operators.saved'));
				return;
			}

			if (isImageCreatorOperator) {
				const modelToSave: Model = { id: selectedModel.id, name: selectedModel.name };
				const saved = await window.app.saveImageCreatorOperator(selectedProvider, modelToSave);
				if (!saved) throw new Error(t('settings.operators.saveError'));
				setCurrentImageCreatorOperator({
					...OPERATOR_DEFINITIONS.imageCreator,
					provider: selectedProvider,
					model: modelToSave,
				});
				setSuccessMessage(t('settings.operators.saved'));
				return;
			}

			if (isVideoCreatorOperator) {
				const modelToSave: Model = { id: selectedModel.id, name: selectedModel.name };
				const saved = await window.app.saveTextToVideoOperator(selectedProvider, modelToSave);
				if (!saved) throw new Error(t('settings.operators.saveError'));
				setCurrentTextToVideoOperator({
					...OPERATOR_DEFINITIONS.videoCreator,
					provider: selectedProvider,
					model: modelToSave,
				});
				setSuccessMessage(t('settings.operators.saved'));
				return;
			}

			if (isMusicCreatorOperator) {
				const modelToSave: Model = { id: selectedModel.id, name: selectedModel.name };
				const saved = await window.app.saveMusicCreatorOperator(selectedProvider, modelToSave);
				if (!saved) throw new Error(t('settings.operators.saveError'));
				setCurrentMusicCreatorOperator({
					...OPERATOR_DEFINITIONS.musicCreator,
					provider: selectedProvider,
					model: modelToSave,
				});
				setSuccessMessage(t('settings.operators.saved'));
				return;
			}

			const modelToSave: Model = supportsModelReasoningEffortProvider(selectedProvider.id)
				? {
						...selectedModel,
						effort: effortForModel(selectedModel.id, effort, selectedProvider.id),
					}
				: { id: selectedModel.id, name: selectedModel.name };
			const saved = await window.app.saveAssistantOperator(selectedProvider, modelToSave);
			if (!saved) throw new Error(t('settings.operators.saveError'));
			setCurrentAssistantOperator({
				...OPERATOR_DEFINITIONS.assistant,
				provider: selectedProvider,
				model: modelToSave,
			});
			setSuccessMessage(t('settings.operators.saved'));
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.operators.saveError')));
		} finally {
			setSaving(false);
		}
	}, [
		canSave,
		effort,
		isImageCreatorOperator,
		isMusicCreatorOperator,
		isSpeechToTextOperator,
		isTextToSpeechOperator,
		isVideoCreatorOperator,
		selectedModel,
		selectedProvider,
		t,
	]);

	const openChatHistory = useCallback(() => {
		navigate(`/settings/operators/${ASSISTANT_OPERATOR_ID}/details/chathistory`);
	}, [navigate]);

	const isKnownOperator =
		isAssistantOperator ||
		isSpeechToTextOperator ||
		isTextToSpeechOperator ||
		isImageCreatorOperator ||
		isVideoCreatorOperator ||
		isMusicCreatorOperator;
	const operatorIcon = isImageCreatorOperator
		? ImageIcon
		: isVideoCreatorOperator
			? Video
			: isMusicCreatorOperator
				? Music
				: isTextToSpeechOperator
					? Volume2
					: isSpeechToTextOperator
						? Mic
						: Bot;
	const operatorNameKey = isImageCreatorOperator
		? 'settings.operators.imageAssistantName'
		: isVideoCreatorOperator
			? 'settings.operators.videoCreatorName'
			: isMusicCreatorOperator
				? 'settings.operators.musicCreatorName'
				: isTextToSpeechOperator
					? 'settings.operators.textToSpeechName'
					: isSpeechToTextOperator
						? 'settings.operators.speechTranscriberName'
						: 'settings.operators.assistantName';
	const operatorDescriptionKey = isImageCreatorOperator
		? 'settings.operators.imageAssistantDescription'
		: isVideoCreatorOperator
			? 'settings.operators.videoCreatorDescription'
			: isMusicCreatorOperator
				? 'settings.operators.musicCreatorDescription'
				: isTextToSpeechOperator
					? 'settings.operators.textToSpeechDescription'
					: isSpeechToTextOperator
						? 'settings.operators.speechTranscriberDescription'
						: 'settings.operators.fridayDescription';
	const configurationDescriptionKey = isImageCreatorOperator
		? 'settings.operators.imageConfigurationSubtitle'
		: isVideoCreatorOperator
			? 'settings.operators.videoConfigurationSubtitle'
			: isMusicCreatorOperator
				? 'settings.operators.musicConfigurationSubtitle'
				: isTextToSpeechOperator
					? 'settings.operators.textToSpeechConfigurationSubtitle'
					: isSpeechToTextOperator
						? 'settings.operators.speechConfigurationSubtitle'
						: 'settings.operators.subtitle';
	const providerDescriptionKey = isImageCreatorOperator
		? 'settings.operators.imageProviderDescription'
		: isVideoCreatorOperator
			? 'settings.operators.videoProviderDescription'
			: isMusicCreatorOperator
				? 'settings.operators.musicProviderDescription'
				: isTextToSpeechOperator
					? 'settings.operators.textToSpeechProviderDescription'
					: isSpeechToTextOperator
						? 'settings.operators.speechProviderDescription'
						: 'settings.operators.providerDescription';
	const modelLabelKey = isImageCreatorOperator
		? 'settings.operators.imageModel'
		: isVideoCreatorOperator
			? 'settings.operators.videoModel'
			: isMusicCreatorOperator
				? 'settings.operators.musicModel'
				: isTextToSpeechOperator
					? 'settings.operators.textToSpeechModel'
					: isSpeechToTextOperator
						? 'settings.operators.speechModel'
						: 'settings.operators.model';
	const modelDescriptionKey = isImageCreatorOperator
		? 'settings.operators.imageModelDescription'
		: isVideoCreatorOperator
			? 'settings.operators.videoModelDescription'
			: isMusicCreatorOperator
				? 'settings.operators.musicModelDescription'
				: isTextToSpeechOperator
					? 'settings.operators.textToSpeechModelDescription'
					: isSpeechToTextOperator
						? 'settings.operators.speechModelDescription'
						: 'settings.operators.modelDescription';
	const operatorName = t(operatorNameKey);
	const operatorDescription = t(operatorDescriptionKey);
	const configurationDescription = t(configurationDescriptionKey);
	const providerDescription = t(providerDescriptionKey);
	const modelLabel = t(modelLabelKey);
	const modelDescription = t(modelDescriptionKey);
	const textToSpeechProvider = DEFAULT_PROVIDERS.find(
		(provider) => provider.id === TEXT_TO_SPEECH_PROVIDER_ID
	);
	const readOnlyProviderName = isTextToSpeechOperator
		? (textToSpeechProvider?.name ?? 'ElevenLabs')
		: isVideoCreatorOperator
			? 'Video provider'
			: isMusicCreatorOperator
				? 'Music provider'
				: 'Image provider';
	const readOnlyProviderValue = isTextToSpeechOperator
		? TEXT_TO_SPEECH_PROVIDER_ID
		: isVideoCreatorOperator
			? 'video-provider-coming-soon'
			: isMusicCreatorOperator
				? 'music-provider-coming-soon'
				: 'image-provider-coming-soon';
	const readOnlyModel = isTextToSpeechOperator
		? TEXT_TO_SPEECH_MODELS[0]
		: isVideoCreatorOperator
			? TEXT_TO_VIDEO_MODELS[0]
			: isMusicCreatorOperator
				? MUSIC_CREATOR_MODELS[0]
				: IMAGE_CREATOR_MODELS[0];
	const readOnlyModelId = readOnlyModel?.id ?? 'not-available';
	const readOnlyModelName = readOnlyModel?.name ?? t('settings.operators.modelUnavailable');
	const providerCardSummary = selectedProvider
		? selectedModel
			? `${selectedProvider.name} / ${selectedModel.name || selectedModel.id}`
			: selectedProvider.name
		: t('settings.operators.providerPlaceholder');

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader
					title={t('settings.operators.detailsTitle')}
					description={t('settings.operators.description')}
					icon={isAssistantOperator ? undefined : operatorIcon}
				/>
				<SettingsPanel>
					<SettingsLoadingRows rows={3} />
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (!isKnownOperator) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.operators.detailsTitle')} icon={Bot} />
				<SettingsPanel>
					<SettingsEmptyState
						icon={CircleOff}
						title={t('settings.operators.notFoundTitle')}
						description={t('settings.operators.notFoundDescription')}
						className="min-h-28"
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={operatorName}
				description={operatorDescription}
				icon={isAssistantOperator ? undefined : operatorIcon}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			{successMessage && <SettingsNotice icon={CheckCircle2}>{successMessage}</SettingsNotice>}

			{isAssistantOperator && (
				<SettingsSection title={t('settings.operators.history')}>
					<SettingsPanel>
						<Item
							as="button"
							type="button"
							size="md"
							className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
							onClick={openChatHistory}
						>
							<ItemContent className="min-w-0 flex-1">
								<ItemTitle>{t('settings.chatHistory.title')}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<ChevronRight className="size-3 text-muted-foreground" strokeWidth={1.8} />
							</ItemActions>
						</Item>
					</SettingsPanel>
				</SettingsSection>
			)}

			{!isRuntimeBackedOperator ? (
				<SettingsSection
					title={t('settings.operators.configuration')}
					description={configurationDescription}
				>
					<SettingsPanel>
						<div className="grid gap-3 p-3">
							<SettingsNotice icon={CircleOff}>
								{t('settings.operators.configurationPending')}
							</SettingsNotice>

							<SettingsField
								id="operator-provider"
								label={t('settings.operators.provider')}
								description={providerDescription}
							>
								<Select value={readOnlyProviderValue} disabled>
									<SelectTrigger id="operator-provider" className="w-full text-xs sm:w-72">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={readOnlyProviderValue}>{readOnlyProviderName}</SelectItem>
									</SelectContent>
								</Select>
							</SettingsField>

							<SettingsField id="operator-model" label={modelLabel} description={modelDescription}>
								<Select value={readOnlyModelId} disabled>
									<SelectTrigger id="operator-model" className="w-full text-xs sm:w-72">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={readOnlyModelId}>{readOnlyModelName}</SelectItem>
									</SelectContent>
								</Select>
							</SettingsField>
						</div>
					</SettingsPanel>
				</SettingsSection>
			) : (
				<SettingsSection
					title={t('settings.operators.configuration')}
					description={configurationDescription}
				>
					<SettingsPanel>
						<Item
							as="button"
							type="button"
							aria-expanded={providerCardOpen}
							aria-controls="operator-provider-card-content"
							size="md"
							className={`text-left hover:bg-muted/30 ${
								providerCardOpen ? 'border-b border-border/60' : ''
							}`}
							onClick={() => setProviderCardOpen((open) => !open)}
						>
							<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
								<ItemTitle>{t('settings.operators.provider')}</ItemTitle>
								<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
									{providerCardSummary}
								</p>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<ChevronDown
									className={`size-3 text-muted-foreground transition-transform ${
										providerCardOpen ? 'rotate-180' : ''
									}`}
									strokeWidth={1.8}
								/>
							</ItemActions>
						</Item>

						{providerCardOpen && (
							<div id="operator-provider-card-content" className="grid gap-3 p-3">
								{isSpeechToTextOperator && providers.length === 0 && (
									<SettingsNotice icon={AlertTriangle}>
										{t('settings.operators.speechProviderMissing')}
									</SettingsNotice>
								)}

								<SettingsField
									id="operator-provider"
									label={t('settings.operators.provider')}
									description={providerDescription}
								>
									<Select
										value={providerId}
										onValueChange={handleProviderChange}
										disabled={providers.length === 0 || saving}
									>
										<SelectTrigger id="operator-provider" className="w-full text-xs sm:w-72">
											<SelectValue placeholder={t('settings.operators.providerPlaceholder')} />
										</SelectTrigger>
										<SelectContent>
											{providers.map((provider) => (
												<SelectItem key={provider.id} value={provider.id}>
													{provider.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField
									id="operator-model"
									label={modelLabel}
									description={modelDescription}
								>
									<Select
										value={modelId}
										onValueChange={handleModelChange}
										disabled={
											!selectedProvider || loadingModels || modelOptions.length === 0 || saving
										}
									>
										<SelectTrigger id="operator-model" className="w-full text-xs sm:w-72">
											<SelectValue
												placeholder={
													loadingModels
														? t('settings.operators.modelsLoading')
														: t('settings.operators.modelPlaceholder')
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{modelOptions.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name || model.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{selectedProvider && !loadingModels && modelOptions.length === 0 && (
										<p className="text-[11px] leading-4 text-muted-foreground">
											{t('settings.operators.noModels')}
										</p>
									)}
								</SettingsField>

								{showEffort && (
									<SettingsField
										id="operator-effort"
										label={t('settings.operators.effort')}
										description={t('settings.operators.effortDescription')}
									>
										<Select
											value={effort}
											onValueChange={handleEffortChange}
											disabled={!selectedProvider || !selectedModel || saving}
										>
											<SelectTrigger id="operator-effort" className="w-full text-xs sm:w-72">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{effortOptions.map((value) => (
													<SelectItem key={value} value={value}>
														{t(`settings.operators.effortOptions.${value}`)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</SettingsField>
								)}

								<div className="flex justify-end">
									<Button
										type="button"
										size="sm"
										disabled={!canSave}
										onClick={() => void handleSave()}
									>
										{saving ? (
											<LoaderCircle className="size-3.5 animate-spin" />
										) : (
											<Save className="size-3.5" />
										)}
										{saving ? t('settings.operators.saving') : t('common.save')}
									</Button>
								</div>
							</div>
						)}
					</SettingsPanel>
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default OperatorDetailsPage;
