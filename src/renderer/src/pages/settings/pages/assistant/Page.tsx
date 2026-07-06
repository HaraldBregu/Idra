import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { DEFAULT_PROVIDERS } from '../../../../../../shared';
import {
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
} from '../../../../../../shared/provider_models_definitions';
import { Button } from '@/components/ui/button';
import type { Model } from '@/lib/compat';
import type { PublicProvider } from '../../../../../../shared';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../../components';
import { ModelProviderConfiguration } from '../../components/model-configuration';
import {
	firstErrorMessage,
	initialModelConfigurationState,
	type ModelConfigurationState,
} from '../../components/model-configuration-state';
import type { ProviderModelGroup } from '../../../start/types';

type CatalogProvider = (typeof DEFAULT_PROVIDERS)[number];

function toPublicProvider(provider: CatalogProvider): PublicProvider {
	return {
		id: provider.id,
		name: provider.name,
		baseUrl: provider.baseUrl,
		...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
		...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
	};
}

function getCatalogProviderById(providerId: string): CatalogProvider | undefined {
	return DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
}

function getProviderLlmModels(providerId: string): Model[] {
	return [...(LLM_MODELS_BY_PROVIDER[providerId] ?? [])];
}

async function loadAssistantState(): Promise<ModelConfigurationState> {
	const [storedProvider, storedModelId] = await Promise.all([
		window.agent.getProvider(),
		window.agent.getModelId(),
	]);
	const providers = LLM_PROVIDERS.flatMap((providerId) => {
		const provider = getCatalogProviderById(providerId);
		return provider && getProviderLlmModels(providerId).length > 0
			? [toPublicProvider(provider)]
			: [];
	});
	const modelGroups: ProviderModelGroup[] = providers.map((provider) => ({
		provider,
		models: getProviderLlmModels(provider.id),
	}));
	const preferredGroup =
		modelGroups.find((group) => group.provider.id === storedProvider?.id) ?? modelGroups[0];
	const preferredModel =
		preferredGroup?.models.find((model) => model.id === storedModelId) ??
		preferredGroup?.models[0];

	return {
		providers,
		modelGroups,
		providerId: preferredGroup?.provider.id ?? '',
		modelId: preferredModel?.id ?? '',
		loading: false,
		loadingModels: false,
		saving: false,
		saved: false,
		error: null,
	};
}

const AssistantPage: React.FC = () => {
	const { t } = useTranslation();
	const [state, setState] = useState<ModelConfigurationState>(initialModelConfigurationState);
	const [historyDeleting, setHistoryDeleting] = useState(false);

	const selectedGroup = useMemo(
		() => state.modelGroups.find((group) => group.provider.id === state.providerId),
		[state.modelGroups, state.providerId]
	);
	const selectedProvider = selectedGroup?.provider;
	const selectedModel = selectedGroup?.models.find((model) => model.id === state.modelId);

	useEffect(() => {
		let mounted = true;
		void loadAssistantState()
			.then((nextState) => {
				if (mounted) setState(nextState);
			})
			.catch((error) => {
				if (!mounted) return;
				setState({
					...initialModelConfigurationState,
					loading: false,
					loadingModels: false,
					error: firstErrorMessage(error, t('settings.modelServices.loadError')),
				});
			});
		return () => {
			mounted = false;
		};
	}, [t]);

	const handleProviderChange = (nextProviderId: string): void => {
		const group = state.modelGroups.find((item) => item.provider.id === nextProviderId);
		setState((current) => ({
			...current,
			providerId: nextProviderId,
			modelId: group?.models[0]?.id ?? '',
			saved: false,
			error: null,
		}));
	};

	const handleModelChange = (nextModelId: string): void => {
		setState((current) => ({
			...current,
			modelId: nextModelId,
			saved: false,
			error: null,
		}));
	};

	const handleSave = async (): Promise<void> => {
		if (!selectedProvider || !selectedModel) return;
		setState((current) => ({ ...current, saving: true, saved: false, error: null }));
		try {
			const didSave =
				(await window.agent.setProvider(selectedProvider)) &&
				(await window.agent.setModelId(selectedModel.id));
			if (!didSave) throw new Error(t('settings.modelServices.saveError'));
			setState((current) => ({ ...current, saving: false, saved: true }));
		} catch (error) {
			setState((current) => ({
				...current,
				saving: false,
				error: firstErrorMessage(error, t('settings.modelServices.saveError')),
			}));
		}
	};

	const handleClearHistory = async (): Promise<void> => {
		if (!window.confirm(t('settings.chatHistory.confirmDelete'))) return;
		setHistoryDeleting(true);
		setState((current) => ({ ...current, error: null }));
		try {
			await window.agent.clearMessages(HOME_AGENT_SESSION_ID);
		} catch (error) {
			setState((current) => ({
				...current,
				error: firstErrorMessage(error, t('settings.chatHistory.errors.delete')),
			}));
		} finally {
			setHistoryDeleting(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.modelServices.assistantName')}
				description={t('settings.modelServices.fridayDescription')}
			/>

			{state.error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{state.error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.modelServices.configuration')}>
				<ModelProviderConfiguration
					configState={state}
					idPrefix="assistant"
					providerDescription={t('settings.modelServices.providerDescription')}
					modelDescription={t('settings.modelServices.modelDescription')}
					onProviderChange={handleProviderChange}
					onModelChange={handleModelChange}
					onSave={() => void handleSave()}
				/>
			</SettingsSection>

			<SettingsSection title={t('settings.modelServices.history')}>
				<SettingsPanel>
					<SettingsRow
						title={t('settings.modelServices.history')}
						description={t('settings.chatHistory.description')}
						className="grid-cols-[minmax(0,1fr)_auto]"
						actionClassName="w-auto justify-end"
						actions={
							<Button
								type="button"
								variant="destructive"
								size="icon"
								className="size-8"
								disabled={historyDeleting}
								aria-label={t('settings.chatHistory.delete')}
								onClick={() => void handleClearHistory()}
							>
								{historyDeleting ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Trash2 className="size-3" />
								)}
							</Button>
						}
					/>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AssistantPage;
