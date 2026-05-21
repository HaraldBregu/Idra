import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
	AlertTriangle,
	Bot,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	CircleOff,
	ClipboardList,
	Clock3,
	ImageIcon,
	LoaderCircle,
	Mic,
	Music,
	Save,
	ScanText,
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
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from '../../../components';
import {
	DEFAULT_PROVIDERS,
	type PublicProvider,
} from '../../../../../../../shared/providers';
import {
	DEFAULT_MODEL_REASONING_EFFORT,
	DOCUMENT_READER_OCR_OPERATOR_ID,
	DOCUMENT_READER_OCR_MODELS,
	IMAGE_CREATOR_OPERATOR_ID,
	IMAGE_CREATOR_MODELS,
	MUSIC_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_MODELS,
	SPEECH_TO_TEXT_OPERATOR_ID,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TRANSCRIBER_PROVIDER_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_ID,
	VIDEO_CREATOR_OPERATOR_ID,
	VIDEO_CREATOR_MODELS,
	getDefaultModelReasoningEffort,
	getModelReasoningEfforts,
	isModelReasoningEffortSupported,
	type Agent,
	type Model,
	type ModelReasoningEffort,
} from '../../../../../../../shared/service';

const FRIDAY_AGENT_ID = 'main';
const FRIDAY_AGENT_SLUG = 'friday';
const OPENAI_PROVIDER_ID = 'openai';
const DEEPSEEK_PROVIDER_ID = 'deepseek';
const CRON_TASK_OPERATOR_ID = 'cron-task';
const BACKGROUND_TASK_OPERATOR_ID = 'background-task';

function isOpenAiProvider(providerId: string): boolean {
	return providerId.trim().toLowerCase() === OPENAI_PROVIDER_ID;
}

function supportsReasoningEffortProvider(providerId: string): boolean {
	const normalizedProviderId = providerId.trim().toLowerCase();
	return normalizedProviderId === OPENAI_PROVIDER_ID || normalizedProviderId === DEEPSEEK_PROVIDER_ID;
}

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
	return isModelReasoningEffortSupported(model.id, model.effort, providerId) ? model.effort : undefined;
}

function mergeProviders(
	providers: readonly PublicProvider[],
	agent: Agent | undefined
): PublicProvider[] {
	const byId = new Map(providers.map((provider) => [provider.id, provider]));
	if (agent && !byId.has(agent.provider.id)) {
		byId.set(agent.provider.id, agent.provider);
	}
	return [...byId.values()];
}

const OperatorDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { operatorId } = useParams<{ operatorId: string }>();
	const decodedOperatorId = decodeURIComponent(operatorId ?? '');
	const isFridayAgent = decodedOperatorId === FRIDAY_AGENT_SLUG || decodedOperatorId === FRIDAY_AGENT_ID;
	const isSpeechTranscriberAgent = decodedOperatorId === SPEECH_TO_TEXT_OPERATOR_ID;
	const isTextToSpeechAgent = decodedOperatorId === TEXT_TO_SPEECH_OPERATOR_ID;
	const isImageAssistantAgent = decodedOperatorId === IMAGE_CREATOR_OPERATOR_ID;
	const isVideoCreatorAgent = decodedOperatorId === VIDEO_CREATOR_OPERATOR_ID;
	const isMusicCreatorAgent = decodedOperatorId === MUSIC_CREATOR_OPERATOR_ID;
	const isDocumentReaderAgent = decodedOperatorId === DOCUMENT_READER_OCR_OPERATOR_ID;
	const isCronTaskOperator = decodedOperatorId === CRON_TASK_OPERATOR_ID;
	const isBackgroundTaskOperator = decodedOperatorId === BACKGROUND_TASK_OPERATOR_ID;
	const isServiceBackedAgent = isFridayAgent || isSpeechTranscriberAgent;
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [currentAgent, setCurrentAgent] = useState<Agent | undefined>();
	const [currentSpeechTranscriber, setCurrentSpeechTranscriber] = useState<Agent | undefined>();
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

		if (!isServiceBackedAgent) {
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

		const serviceRequest = isSpeechTranscriberAgent
			? window.app.getSpeechToTextOperator()
			: window.app.getAssistantOperator();

		void Promise.all([window.app.getProviders(), serviceRequest])
			.then(([nextProviders, nextService]) => {
				if (!mounted) return;
				const mergedProviders = mergeProviders(nextProviders, nextService);
				const availableProviders = isSpeechTranscriberAgent
					? mergedProviders.filter((provider) => isOpenAiProvider(provider.id))
					: mergedProviders;
				const preferredProvider = isSpeechTranscriberAgent
					? availableProviders.find((provider) => provider.id === nextService?.provider.id) ??
						availableProviders.find((provider) => provider.id === SPEECH_TRANSCRIBER_PROVIDER_ID) ??
						availableProviders[0]
					: availableProviders.find((provider) => provider.id === nextService?.provider.id) ??
						availableProviders[0];

				setProviders(availableProviders);
				setCurrentAgent(isFridayAgent ? nextService : undefined);
				setCurrentSpeechTranscriber(isSpeechTranscriberAgent ? nextService : undefined);
				setProviderId(preferredProvider?.id ?? '');
				setModelId(
					nextService && preferredProvider?.id === nextService.provider.id
						? isSpeechTranscriberAgent &&
							!SPEECH_TO_TEXT_MODELS.some((model) => model.id === nextService.model.id)
							? SPEECH_TO_TEXT_MODELS[0]?.id ?? ''
							: nextService.model.id
						: isSpeechTranscriberAgent ? SPEECH_TO_TEXT_MODELS[0]?.id ?? '' : ''
				);
				setEffort(
					nextService && preferredProvider?.id === nextService.provider.id && isFridayAgent
						? effortForModel(nextService.model.id, nextService.model.effort, preferredProvider.id)
						: DEFAULT_MODEL_REASONING_EFFORT
				);
			})
			.catch((error) => {
				if (!mounted) return;
				setProviders([]);
				setCurrentAgent(undefined);
				setCurrentSpeechTranscriber(undefined);
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
	}, [isFridayAgent, isServiceBackedAgent, isSpeechTranscriberAgent, t]);

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

		if (isSpeechTranscriberAgent) {
			const speechModels = Array.from(SPEECH_TO_TEXT_MODELS);
			setModels(speechModels);
				setModelId((current) => {
					if (current && speechModels.some((model) => model.id === current)) return current;
					if (
						currentSpeechTranscriber?.provider.id === selectedProvider.id &&
						speechModels.some((model) => model.id === currentSpeechTranscriber.model.id)
					) {
						return currentSpeechTranscriber.model.id;
					}
					return speechModels[0]?.id ?? '';
				});
			setLoadingModels(false);
			setErrorMessage('');
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
					if (currentAgent?.provider.id === selectedProvider.id) return currentAgent.model.id;
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
	}, [currentAgent, currentSpeechTranscriber, isSpeechTranscriberAgent, selectedProvider, t]);

	const modelOptions = useMemo(() => {
		if (isSpeechTranscriberAgent) return Array.from(SPEECH_TO_TEXT_MODELS);

		const byId = new Map(models.map((model) => [model.id, model]));
		if (
			currentAgent?.provider.id === providerId &&
			currentAgent.model.id &&
			!byId.has(currentAgent.model.id)
		) {
			byId.set(currentAgent.model.id, currentAgent.model);
		}
		return [...byId.values()];
	}, [currentAgent, isSpeechTranscriberAgent, models, providerId]);

	const selectedModel = modelOptions.find((model) => model.id === modelId);
	const showEffort = isFridayAgent && supportsReasoningEffortProvider(providerId);
	const effortOptions = useMemo(
		() => showEffort ? getModelReasoningEfforts(modelId, providerId) : [],
		[modelId, providerId, showEffort]
	);
	const selectedEffort = showEffort ? effort : undefined;
	const currentEffort = currentAgent && supportsReasoningEffortProvider(currentAgent.provider.id)
		? storedEffortForComparison(currentAgent.model, currentAgent.provider.id)
		: undefined;
	const hasChanges = isSpeechTranscriberAgent
		? !currentSpeechTranscriber ||
			currentSpeechTranscriber.provider.id !== providerId ||
			currentSpeechTranscriber.model.id !== modelId
		: !currentAgent ||
			currentAgent.provider.id !== providerId ||
			currentAgent.model.id !== modelId ||
			currentEffort !== selectedEffort;
	const canSave = Boolean(selectedProvider && selectedModel && hasChanges && !loadingModels && !saving);

	const handleProviderChange = useCallback((nextValue: string | null): void => {
		setProviderId(nextValue ?? '');
		setModelId('');
		setEffort(DEFAULT_MODEL_REASONING_EFFORT);
		setSuccessMessage('');
	}, []);

	const handleModelChange = useCallback((nextValue: string | null): void => {
		const nextModelId = nextValue ?? '';
		setModelId(nextModelId);
		setEffort((current) => effortForModel(nextModelId, current, providerId));
		setSuccessMessage('');
	}, [providerId]);

	const handleEffortChange = useCallback((nextValue: string | null): void => {
		setEffort(effortForModel(modelId, nextValue, providerId));
		setSuccessMessage('');
	}, [modelId, providerId]);

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
			if (isSpeechTranscriberAgent) {
				const modelToSave: Model = { id: selectedModel.id, name: selectedModel.name };
				const saved = await window.app.saveSpeechToTextOperator(selectedProvider, modelToSave);
				if (!saved) throw new Error(t('settings.operators.saveError'));
				setCurrentSpeechTranscriber({ provider: selectedProvider, model: modelToSave });
				setSuccessMessage(t('settings.operators.saved'));
				return;
			}

			const modelToSave: Model = supportsReasoningEffortProvider(selectedProvider.id)
				? { ...selectedModel, effort: effortForModel(selectedModel.id, effort, selectedProvider.id) }
				: { id: selectedModel.id, name: selectedModel.name };
			const saved = await window.app.saveAssistantOperator(selectedProvider, modelToSave);
			if (!saved) throw new Error(t('settings.operators.saveError'));
			setCurrentAgent({ provider: selectedProvider, model: modelToSave });
			setSuccessMessage(t('settings.operators.saved'));
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.operators.saveError')));
		} finally {
			setSaving(false);
		}
	}, [canSave, effort, isSpeechTranscriberAgent, selectedModel, selectedProvider, t]);

	const openChatHistory = useCallback(() => {
		navigate(`/settings/operators/${FRIDAY_AGENT_SLUG}/details/chathistory`);
	}, [navigate]);

	const workflowConfiguration = isCronTaskOperator
		? {
				route: '/settings/cron',
				openLabelKey: 'settings.operators.openCronTaskConfiguration',
				runtimeTitleKey: 'settings.operators.cronTaskRuntime',
				runtimeDescriptionKey: 'settings.operators.cronTaskRuntimeDescription',
				runtimeValueKey: 'settings.operators.cronTaskRuntimeValue',
				scopeTitleKey: 'settings.operators.cronTaskScope',
				scopeDescriptionKey: 'settings.operators.cronTaskScopeDescription',
				scopeValueKey: 'settings.operators.cronTaskScopeValue',
			}
		: isBackgroundTaskOperator
			? {
					route: '/settings/task-manager',
					openLabelKey: 'settings.operators.openBackgroundTaskConfiguration',
					runtimeTitleKey: 'settings.operators.backgroundTaskRuntime',
					runtimeDescriptionKey: 'settings.operators.backgroundTaskRuntimeDescription',
					runtimeValueKey: 'settings.operators.backgroundTaskRuntimeValue',
					scopeTitleKey: 'settings.operators.backgroundTaskTypes',
					scopeDescriptionKey: 'settings.operators.backgroundTaskTypesDescription',
					scopeValueKey: 'settings.operators.backgroundTaskTypesValue',
				}
			: null;
	const isKnownOperator =
		isFridayAgent ||
		isSpeechTranscriberAgent ||
		isTextToSpeechAgent ||
		isImageAssistantAgent ||
		isVideoCreatorAgent ||
		isMusicCreatorAgent ||
		isDocumentReaderAgent ||
		Boolean(workflowConfiguration);
	const agentIcon = isImageAssistantAgent
		? ImageIcon
		: isVideoCreatorAgent
			? Video
			: isMusicCreatorAgent
				? Music
				: isDocumentReaderAgent
					? ScanText
					: isCronTaskOperator
						? Clock3
						: isBackgroundTaskOperator
							? ClipboardList
		: isTextToSpeechAgent
			? Volume2
			: isSpeechTranscriberAgent
				? Mic
				: Bot;
	const agentNameKey = isImageAssistantAgent
		? 'settings.operators.imageAssistantName'
		: isVideoCreatorAgent
			? 'settings.operators.videoCreatorName'
			: isMusicCreatorAgent
				? 'settings.operators.musicCreatorName'
				: isDocumentReaderAgent
					? 'settings.operators.documentReaderName'
					: isCronTaskOperator
						? 'settings.operators.cronTaskName'
						: isBackgroundTaskOperator
							? 'settings.operators.backgroundTaskName'
		: isTextToSpeechAgent
			? 'settings.operators.textToSpeechName'
			: isSpeechTranscriberAgent
				? 'settings.operators.speechTranscriberName'
				: 'settings.operators.fridayName';
	const agentDescriptionKey = isImageAssistantAgent
		? 'settings.operators.imageAssistantDescription'
		: isVideoCreatorAgent
			? 'settings.operators.videoCreatorDescription'
			: isMusicCreatorAgent
				? 'settings.operators.musicCreatorDescription'
				: isDocumentReaderAgent
					? 'settings.operators.documentReaderDescription'
					: isCronTaskOperator
						? 'settings.operators.cronTaskDescription'
						: isBackgroundTaskOperator
							? 'settings.operators.backgroundTaskDescription'
		: isTextToSpeechAgent
			? 'settings.operators.textToSpeechDescription'
			: isSpeechTranscriberAgent
				? 'settings.operators.speechTranscriberDescription'
				: 'settings.operators.fridayDescription';
	const configurationDescriptionKey = isImageAssistantAgent
		? 'settings.operators.imageConfigurationSubtitle'
		: isVideoCreatorAgent
			? 'settings.operators.videoConfigurationSubtitle'
			: isMusicCreatorAgent
				? 'settings.operators.musicConfigurationSubtitle'
				: isDocumentReaderAgent
					? 'settings.operators.documentReaderConfigurationSubtitle'
					: isCronTaskOperator
						? 'settings.operators.cronTaskConfigurationSubtitle'
						: isBackgroundTaskOperator
							? 'settings.operators.backgroundTaskConfigurationSubtitle'
		: isTextToSpeechAgent
			? 'settings.operators.textToSpeechConfigurationSubtitle'
			: isSpeechTranscriberAgent
				? 'settings.operators.speechConfigurationSubtitle'
				: 'settings.operators.subtitle';
	const providerDescriptionKey = isImageAssistantAgent
		? 'settings.operators.imageProviderDescription'
		: isVideoCreatorAgent
			? 'settings.operators.videoProviderDescription'
			: isMusicCreatorAgent
				? 'settings.operators.musicProviderDescription'
				: isDocumentReaderAgent
					? 'settings.operators.documentReaderProviderDescription'
		: isTextToSpeechAgent
			? 'settings.operators.textToSpeechProviderDescription'
			: isSpeechTranscriberAgent
				? 'settings.operators.speechProviderDescription'
				: 'settings.operators.providerDescription';
	const modelLabelKey = isImageAssistantAgent
		? 'settings.operators.imageModel'
		: isVideoCreatorAgent
			? 'settings.operators.videoModel'
			: isMusicCreatorAgent
				? 'settings.operators.musicModel'
				: isDocumentReaderAgent
					? 'settings.operators.documentReaderModel'
		: isTextToSpeechAgent
			? 'settings.operators.textToSpeechModel'
			: isSpeechTranscriberAgent
				? 'settings.operators.speechModel'
				: 'settings.operators.model';
	const modelDescriptionKey = isImageAssistantAgent
		? 'settings.operators.imageModelDescription'
		: isVideoCreatorAgent
			? 'settings.operators.videoModelDescription'
			: isMusicCreatorAgent
				? 'settings.operators.musicModelDescription'
				: isDocumentReaderAgent
					? 'settings.operators.documentReaderModelDescription'
		: isTextToSpeechAgent
			? 'settings.operators.textToSpeechModelDescription'
			: isSpeechTranscriberAgent
				? 'settings.operators.speechModelDescription'
				: 'settings.operators.modelDescription';
	const agentName = t(agentNameKey);
	const agentDescription = t(agentDescriptionKey);
	const configurationDescription = t(configurationDescriptionKey);
	const providerDescription = t(providerDescriptionKey);
	const modelLabel = t(modelLabelKey);
	const modelDescription = t(modelDescriptionKey);
	const textToSpeechProvider = DEFAULT_PROVIDERS.find(
		(provider) => provider.id === TEXT_TO_SPEECH_PROVIDER_ID
	);
	const readOnlyProviderName = isTextToSpeechAgent
		? textToSpeechProvider?.name ?? 'ElevenLabs'
		: isVideoCreatorAgent
			? 'Video provider'
			: isMusicCreatorAgent
				? 'Music provider'
				: isDocumentReaderAgent
					? 'OCR provider'
		: 'Image provider';
	const readOnlyProviderValue = isTextToSpeechAgent
		? TEXT_TO_SPEECH_PROVIDER_ID
		: isVideoCreatorAgent
			? 'video-provider-coming-soon'
			: isMusicCreatorAgent
				? 'music-provider-coming-soon'
				: isDocumentReaderAgent
					? 'document-reader-provider-coming-soon'
		: 'image-provider-coming-soon';
	const readOnlyModel =
		isTextToSpeechAgent
			? TEXT_TO_SPEECH_MODELS[0]
			: isVideoCreatorAgent
				? VIDEO_CREATOR_MODELS[0]
				: isMusicCreatorAgent
					? MUSIC_CREATOR_MODELS[0]
					: isDocumentReaderAgent
						? DOCUMENT_READER_OCR_MODELS[0]
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
					icon={isFridayAgent ? undefined : agentIcon}
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
				title={agentName}
				description={agentDescription}
				icon={isFridayAgent ? undefined : agentIcon}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			{successMessage && (
				<SettingsNotice icon={CheckCircle2}>
					{successMessage}
				</SettingsNotice>
			)}

			{isFridayAgent && (
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

			{workflowConfiguration ? (
				<SettingsSection
					title={t('settings.operators.configuration')}
					description={configurationDescription}
				>
					<SettingsPanel>
						<SettingsRow
							title={t(workflowConfiguration.runtimeTitleKey)}
							description={t(workflowConfiguration.runtimeDescriptionKey)}
						>
							<SettingsValue>{t(workflowConfiguration.runtimeValueKey)}</SettingsValue>
						</SettingsRow>
						<SettingsRow
							title={t(workflowConfiguration.scopeTitleKey)}
							description={t(workflowConfiguration.scopeDescriptionKey)}
						>
							<SettingsValue mono>{t(workflowConfiguration.scopeValueKey)}</SettingsValue>
						</SettingsRow>
						<Item
							as="button"
							type="button"
							size="md"
							className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
							onClick={() => navigate(workflowConfiguration.route)}
						>
							<ItemContent className="min-w-0 flex-1">
								<ItemTitle>{t(workflowConfiguration.openLabelKey)}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<ChevronRight className="size-3 text-muted-foreground" strokeWidth={1.8} />
							</ItemActions>
						</Item>
					</SettingsPanel>
				</SettingsSection>
			) : !isServiceBackedAgent ? (
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
								id="agent-provider"
								label={t('settings.operators.provider')}
								description={providerDescription}
							>
								<Select value={readOnlyProviderValue} disabled>
									<SelectTrigger id="agent-provider" className="w-full text-xs sm:w-72">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={readOnlyProviderValue}>
											{readOnlyProviderName}
										</SelectItem>
									</SelectContent>
								</Select>
							</SettingsField>

							<SettingsField
								id="agent-model"
								label={modelLabel}
								description={modelDescription}
							>
								<Select value={readOnlyModelId} disabled>
									<SelectTrigger id="agent-model" className="w-full text-xs sm:w-72">
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
							aria-controls="agent-provider-card-content"
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
							<div id="agent-provider-card-content" className="grid gap-3 p-3">
								{isSpeechTranscriberAgent && providers.length === 0 && (
									<SettingsNotice icon={AlertTriangle}>
										{t('settings.operators.speechProviderMissing')}
									</SettingsNotice>
								)}

								<SettingsField
									id="agent-provider"
									label={t('settings.operators.provider')}
									description={providerDescription}
								>
									<Select
										value={providerId}
										onValueChange={handleProviderChange}
										disabled={providers.length === 0 || saving}
									>
										<SelectTrigger id="agent-provider" className="w-full text-xs sm:w-72">
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
									id="agent-model"
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
										<SelectTrigger id="agent-model" className="w-full text-xs sm:w-72">
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
										id="agent-effort"
										label={t('settings.operators.effort')}
										description={t('settings.operators.effortDescription')}
									>
										<Select
											value={effort}
											onValueChange={handleEffortChange}
											disabled={!selectedProvider || !selectedModel || saving}
										>
											<SelectTrigger id="agent-effort" className="w-full text-xs sm:w-72">
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
