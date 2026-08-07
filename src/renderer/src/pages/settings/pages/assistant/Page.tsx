import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { modelsFor, providers } from '@/lib/providers';
import { providerIdsFor, providerModels } from '@/lib/providers';
import { ModelOptions } from '@/components/model-options';
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

type CatalogProvider = PublicProvider;

function getCatalogProviderById(providerId: string): CatalogProvider | undefined {
	return providers().find((provider) => provider.id === providerId);
}

function getProviderLlmModels(providerId: string): Model[] {
	return providerModels(providerId, 'llm');
}

async function loadAssistantState(): Promise<ModelConfigurationState> {
	const [storedProvider, storedModelId] = await Promise.all([
		window.agent.getProvider(),
		window.agent.getModelId(),
	]);
	const providers = providerIdsFor('llm').flatMap((providerId) => {
		const provider = getCatalogProviderById(providerId);
		return provider && getProviderLlmModels(providerId).length > 0
			? [provider]
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
	const navigate = useNavigate();
	const [state, setState] = useState<ModelConfigurationState>(initialModelConfigurationState);
	const [modelOptions, setModelOptions] = useState<Record<string, unknown>>({});
	const model = modelsFor('llm').find(
		(item) => item.provider.id === state.providerId && item.id === state.modelId
	);
	const inputs = model?.metadata?.documentationStatus === 'verified' ? model.metadata.inputs : {};

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

	useEffect(() => {
		void window.agent.getModelOptions().then(setModelOptions);
	}, [state.providerId, state.modelId]);

	const saveModelOptions = (next: Record<string, unknown>): void => {
		setModelOptions(next);
		void window.agent.setModelOptions(next);
	};

	const updateModelOption = (key: string, value: unknown): void => {
		const next = { ...modelOptions };
		if (value === undefined || value === '') delete next[key];
		else next[key] = value;
		saveModelOptions(next);
	};

	const handleChange = async (nextProviderId: string, nextModelId: string): Promise<void> => {
		const group = state.modelGroups.find((item) => item.provider.id === nextProviderId);
		const model = group?.models.find((item) => item.id === nextModelId);
		if (!group || !model) return;
		setState((current) => ({
			...current,
			providerId: nextProviderId,
			modelId: nextModelId,
			saving: true,
			saved: false,
			error: null,
		}));
		try {
			const didSave =
				(await window.agent.setProvider(group.provider)) &&
				(await window.agent.setModelId(model.id));
			if (!didSave) throw new Error(t('settings.modelServices.saveError'));
			await window.agent.setModelOptions({});
			setModelOptions({});
			setState((current) => ({ ...current, saving: false, saved: true }));
		} catch (error) {
			setState((current) => ({
				...current,
				saving: false,
				error: firstErrorMessage(error, t('settings.modelServices.saveError')),
			}));
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
					description={t('settings.modelServices.modelDescription')}
					onChange={(providerId, modelId) => void handleChange(providerId, modelId)}
				>
					<ModelOptions inputs={inputs} values={modelOptions} onChange={updateModelOption} />
				</ModelProviderConfiguration>
			</SettingsSection>

			<SettingsSection title={t('settings.modelServices.history')}>
				<SettingsPanel>
					<div
						role="button"
						tabIndex={0}
						className="cursor-pointer hover:bg-muted/40"
						onClick={() => navigate('/settings/assistant/chathistory')}
						onKeyDown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								navigate('/settings/assistant/chathistory');
							}
						}}
					>
						<SettingsRow
							title={t('settings.chatHistory.title')}
							description={t('settings.chatHistory.description')}
							className="grid-cols-[minmax(0,1fr)_auto] border-b-0"
							actionClassName="w-auto justify-end"
							actions={<ChevronRight className="size-4 text-muted-foreground" />}
						/>
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsPanel>
				<div
					role="button"
					tabIndex={0}
					className="cursor-pointer hover:bg-muted/40"
					onClick={() => navigate('/settings/assistant/health')}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							navigate('/settings/assistant/health');
						}
					}}
				>
					<SettingsRow
						title={t('settings.tabs.health')}
						description={t('settings.overview.descriptions.health')}
						className="grid-cols-[minmax(0,1fr)_auto]"
						actionClassName="w-auto justify-end"
						actions={<ChevronRight className="size-4 text-muted-foreground" />}
					/>
				</div>
				<div
					role="button"
					tabIndex={0}
					className="cursor-pointer hover:bg-muted/40"
					onClick={() => navigate('/settings/search')}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							navigate('/settings/search');
						}
					}}
				>
					<SettingsRow
						title={t('settings.tabs.searchEngine')}
						description={t('settings.overview.descriptions.searchEngine')}
						className="grid-cols-[minmax(0,1fr)_auto]"
						actionClassName="w-auto justify-end"
						actions={<ChevronRight className="size-4 text-muted-foreground" />}
					/>
				</div>
				<div
					role="button"
					tabIndex={0}
					className="cursor-pointer hover:bg-muted/40"
					onClick={() => navigate('/settings/assistant/policies')}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							navigate('/settings/assistant/policies');
						}
					}}
				>
					<SettingsRow
						title={t('settings.tabs.policies')}
						description={t('settings.overview.descriptions.policies')}
						className="grid-cols-[minmax(0,1fr)_auto] border-b-0"
						actionClassName="w-auto justify-end"
						actions={<ChevronRight className="size-4 text-muted-foreground" />}
					/>
				</div>
			</SettingsPanel>
		</SettingsPageShell>
	);
};

export default AssistantPage;
