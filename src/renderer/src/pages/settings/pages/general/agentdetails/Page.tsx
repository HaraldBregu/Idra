import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
	AlertTriangle,
	Bot,
	CheckCircle2,
	CircleOff,
	ImageIcon,
	LoaderCircle,
	Mic,
	Save,
	Volume2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from '../../../components';
import {
	DEFAULT_PROVIDERS,
	type PublicProvider,
} from '../../../../../../../shared/providers';
import {
	DEFAULT_MODEL_REASONING_EFFORT,
	IMAGE_ASSISTANT_AGENT_ID,
	IMAGE_ASSISTANT_MODELS,
	SPEECH_TRANSCRIBER_AGENT_ID,
	SPEECH_TRANSCRIBER_MODELS,
	SPEECH_TRANSCRIBER_PROVIDER_ID,
	TEXT_TO_SPEECH_AGENT_ID,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_ID,
	getDefaultModelReasoningEffort,
	getModelReasoningEfforts,
	isModelReasoningEffortSupported,
	type Agent,
	type Model,
	type ModelReasoningEffort,
} from '../../../../../../../shared/service';

const FRIDAY_AGENT_ID = 'main';
const OPENAI_PROVIDER_ID = 'openai';

function isOpenAiProvider(providerId: string): boolean {
	return providerId.trim().toLowerCase() === OPENAI_PROVIDER_ID;
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

function effortForModel(modelId: string, value: unknown): ModelReasoningEffort {
	return isModelReasoningEffortSupported(modelId, value)
		? value
		: getDefaultModelReasoningEffort(modelId);
}

function storedEffortForComparison(model: Model): ModelReasoningEffort | undefined {
	if (model.effort === undefined) return getDefaultModelReasoningEffort(model.id);
	return isModelReasoningEffortSupported(model.id, model.effort) ? model.effort : undefined;
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

const AgentDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const { agentId } = useParams<{ agentId: string }>();
	const decodedAgentId = decodeURIComponent(agentId ?? '');
	const isFridayAgent = decodedAgentId === FRIDAY_AGENT_ID;
	const isSpeechTranscriberAgent = decodedAgentId === SPEECH_TRANSCRIBER_AGENT_ID;
	const isTextToSpeechAgent = decodedAgentId === TEXT_TO_SPEECH_AGENT_ID;
	const isImageAssistantAgent = decodedAgentId === IMAGE_ASSISTANT_AGENT_ID;
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

	useEffect(() => {
		let mounted = true;

		if (!isServiceBackedAgent) {
			setLoading(false);
			return () => {
				mounted = false;
			};
		}

		setLoading(true);
		setErrorMessage('');
		setSuccessMessage('');

		const serviceRequest = isSpeechTranscriberAgent
			? window.app.getSpeechTranscriberService()
			: window.app.getAgentService();

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
							!SPEECH_TRANSCRIBER_MODELS.some((model) => model.id === nextService.model.id)
							? SPEECH_TRANSCRIBER_MODELS[0]?.id ?? ''
							: nextService.model.id
						: isSpeechTranscriberAgent ? SPEECH_TRANSCRIBER_MODELS[0]?.id ?? '' : ''
				);
				setEffort(
					nextService && preferredProvider?.id === nextService.provider.id && isFridayAgent
						? effortForModel(nextService.model.id, nextService.model.effort)
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
				setErrorMessage(getErrorMessage(error, t('settings.agents.loadError')));
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
			const speechModels = Array.from(SPEECH_TRANSCRIBER_MODELS);
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
				setErrorMessage(getErrorMessage(error, t('settings.agents.modelsLoadError')));
			})
			.finally(() => {
				if (mounted) setLoadingModels(false);
			});

		return () => {
			mounted = false;
		};
	}, [currentAgent, currentSpeechTranscriber, isSpeechTranscriberAgent, selectedProvider, t]);

	const modelOptions = useMemo(() => {
		if (isSpeechTranscriberAgent) return Array.from(SPEECH_TRANSCRIBER_MODELS);

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
	const showEffort = isFridayAgent && isOpenAiProvider(providerId);
	const effortOptions = useMemo(
		() => showEffort ? getModelReasoningEfforts(modelId) : [],
		[modelId, showEffort]
	);
	const selectedEffort = showEffort ? effort : undefined;
	const currentEffort = currentAgent && isOpenAiProvider(currentAgent.provider.id)
		? storedEffortForComparison(currentAgent.model)
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
		setEffort((current) => effortForModel(nextModelId, current));
		setSuccessMessage('');
	}, []);

	const handleEffortChange = useCallback((nextValue: string | null): void => {
		setEffort(effortForModel(modelId, nextValue));
		setSuccessMessage('');
	}, [modelId]);

	useEffect(() => {
		if (!showEffort) return;
		setEffort((current) => effortForModel(modelId, current));
	}, [modelId, showEffort]);

	const handleSave = useCallback(async (): Promise<void> => {
		if (!selectedProvider || !selectedModel || !canSave) return;

		setSaving(true);
		setErrorMessage('');
		setSuccessMessage('');
		try {
			if (isSpeechTranscriberAgent) {
				const modelToSave: Model = { id: selectedModel.id, name: selectedModel.name };
				const saved = await window.app.saveSpeechTranscriberService(selectedProvider, modelToSave);
				if (!saved) throw new Error(t('settings.agents.saveError'));
				setCurrentSpeechTranscriber({ provider: selectedProvider, model: modelToSave });
				setSuccessMessage(t('settings.agents.saved'));
				return;
			}

			const modelToSave: Model = isOpenAiProvider(selectedProvider.id)
				? { ...selectedModel, effort: effortForModel(selectedModel.id, effort) }
				: { id: selectedModel.id, name: selectedModel.name };
			const saved = await window.app.saveAgentService(selectedProvider, modelToSave);
			if (!saved) throw new Error(t('settings.agents.saveError'));
			setCurrentAgent({ provider: selectedProvider, model: modelToSave });
			setSuccessMessage(t('settings.agents.saved'));
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.agents.saveError')));
		} finally {
			setSaving(false);
		}
	}, [canSave, effort, isSpeechTranscriberAgent, selectedModel, selectedProvider, t]);

	const isKnownAgent =
		isFridayAgent || isSpeechTranscriberAgent || isTextToSpeechAgent || isImageAssistantAgent;
	const agentIcon = isImageAssistantAgent
		? ImageIcon
		: isTextToSpeechAgent
			? Volume2
			: isSpeechTranscriberAgent
				? Mic
				: Bot;
	const agentNameKey = isImageAssistantAgent
		? 'settings.agents.imageAssistantName'
		: isTextToSpeechAgent
			? 'settings.agents.textToSpeechName'
			: isSpeechTranscriberAgent
				? 'settings.agents.speechTranscriberName'
				: 'settings.agents.fridayName';
	const agentDescriptionKey = isImageAssistantAgent
		? 'settings.agents.imageAssistantDescription'
		: isTextToSpeechAgent
			? 'settings.agents.textToSpeechDescription'
			: isSpeechTranscriberAgent
				? 'settings.agents.speechTranscriberDescription'
				: 'settings.agents.fridayDescription';
	const configurationDescriptionKey = isImageAssistantAgent
		? 'settings.agents.imageConfigurationSubtitle'
		: isTextToSpeechAgent
			? 'settings.agents.textToSpeechConfigurationSubtitle'
			: isSpeechTranscriberAgent
				? 'settings.agents.speechConfigurationSubtitle'
				: 'settings.agents.subtitle';
	const providerDescriptionKey = isImageAssistantAgent
		? 'settings.agents.imageProviderDescription'
		: isTextToSpeechAgent
			? 'settings.agents.textToSpeechProviderDescription'
			: isSpeechTranscriberAgent
				? 'settings.agents.speechProviderDescription'
				: 'settings.agents.providerDescription';
	const modelLabelKey = isImageAssistantAgent
		? 'settings.agents.imageModel'
		: isTextToSpeechAgent
			? 'settings.agents.textToSpeechModel'
			: isSpeechTranscriberAgent
				? 'settings.agents.speechModel'
				: 'settings.agents.model';
	const modelDescriptionKey = isImageAssistantAgent
		? 'settings.agents.imageModelDescription'
		: isTextToSpeechAgent
			? 'settings.agents.textToSpeechModelDescription'
			: isSpeechTranscriberAgent
				? 'settings.agents.speechModelDescription'
				: 'settings.agents.modelDescription';
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
		: 'Image provider';
	const readOnlyProviderValue = isTextToSpeechAgent
		? TEXT_TO_SPEECH_PROVIDER_ID
		: 'image-provider-coming-soon';
	const readOnlyModel =
		isTextToSpeechAgent ? TEXT_TO_SPEECH_MODELS[0] : IMAGE_ASSISTANT_MODELS[0];
	const readOnlyModelId = readOnlyModel?.id ?? 'not-available';
	const readOnlyModelName = readOnlyModel?.name ?? t('settings.agents.modelUnavailable');

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader
					title={t('settings.agents.detailsTitle')}
					description={t('settings.agents.description')}
					icon={agentIcon}
				/>
				<SettingsPanel>
					<SettingsLoadingRows rows={3} />
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (!isKnownAgent) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.agents.detailsTitle')} icon={Bot} />
				<SettingsPanel>
					<SettingsEmptyState
						icon={CircleOff}
						title={t('settings.agents.notFoundTitle')}
						description={t('settings.agents.notFoundDescription')}
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
				icon={agentIcon}
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

			<SettingsSection title={t('settings.agents.identity')}>
				<SettingsPanel>
					<SettingsRow
						icon={agentIcon}
						title={agentName}
						description={agentDescription}
						actions={
							<Badge
								variant="outline"
								className="h-5 rounded-md bg-muted/40 px-2 font-mono text-[10px] text-muted-foreground"
							>
								{decodedAgentId}
							</Badge>
						}
					/>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.agents.configuration')}
				description={configurationDescription}
			>
				<SettingsPanel>
					<div className="grid gap-3 p-3">
						{isSpeechTranscriberAgent && providers.length === 0 && (
							<SettingsNotice icon={AlertTriangle}>
								{t('settings.agents.speechProviderMissing')}
							</SettingsNotice>
						)}

						<SettingsField
							id="agent-provider"
							label={t('settings.agents.provider')}
							description={providerDescription}
						>
							<Select
								value={providerId}
								onValueChange={handleProviderChange}
								disabled={providers.length === 0 || saving}
							>
								<SelectTrigger id="agent-provider" className="w-full text-xs sm:w-72">
									<SelectValue placeholder={t('settings.agents.providerPlaceholder')} />
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
								disabled={!selectedProvider || loadingModels || modelOptions.length === 0 || saving}
							>
								<SelectTrigger id="agent-model" className="w-full text-xs sm:w-72">
									<SelectValue
										placeholder={
											loadingModels
												? t('settings.agents.modelsLoading')
												: t('settings.agents.modelPlaceholder')
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
									{t('settings.agents.noModels')}
								</p>
							)}
						</SettingsField>

						{showEffort && (
							<SettingsField
								id="agent-effort"
								label={t('settings.agents.effort')}
								description={t('settings.agents.effortDescription')}
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
												{t(`settings.agents.effortOptions.${value}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</SettingsField>
						)}

						<div className="flex justify-end">
							<Button type="button" size="sm" disabled={!canSave} onClick={() => void handleSave()}>
								{saving ? (
									<LoaderCircle className="size-3.5 animate-spin" />
								) : (
									<Save className="size-3.5" />
								)}
								{saving ? t('settings.agents.saving') : t('common.save')}
							</Button>
						</div>
					</div>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AgentDetailsPage;
