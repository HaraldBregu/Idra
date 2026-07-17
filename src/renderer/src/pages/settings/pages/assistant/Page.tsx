import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { DEFAULT_PROVIDERS } from '../../../../../../shared';
import {
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
} from '../../../../../../shared/provider_models_definitions';
import type { Model } from '@/lib/compat';
import type { PublicProvider } from '../../../../../../shared';
import {
	SettingsLoadingRows,
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

type GoalSettings = Awaited<ReturnType<typeof window.agent.goalGetSettings>>;

const GoalBudgetRow: React.FC<{
	id: string;
	title: string;
	value: number;
	onCommit: (value: number) => void;
}> = ({ id, title, value, onCommit }) => (
	<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
		<ItemContent className="min-w-0 flex-1">
			<ItemTitle className="max-w-full truncate">{title}</ItemTitle>
		</ItemContent>
		<ItemActions className="ml-auto flex-none justify-end">
			<Input
				key={`${id}-${value}`}
				id={id}
				type="number"
				min={1}
				defaultValue={value}
				aria-label={title}
				className="h-7 w-44 text-xs"
				onKeyDown={(event) => {
					if (event.key === 'Enter') event.currentTarget.blur();
				}}
				onBlur={(event) => {
					const next = Number.parseInt(event.currentTarget.value, 10);
					if (!Number.isInteger(next) || next < 1) {
						event.currentTarget.value = String(value);
						return;
					}
					if (next !== value) onCommit(next);
				}}
			/>
		</ItemActions>
	</Item>
);

const AssistantPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [state, setState] = useState<ModelConfigurationState>(initialModelConfigurationState);
	const [goalSettings, setGoalSettings] = useState<GoalSettings | null>(null);
	const [goalError, setGoalError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void window.agent
			.goalGetSettings()
			.then((settings) => {
				if (mounted) setGoalSettings(settings);
			})
			.catch((error: unknown) => {
				if (!mounted) return;
				setGoalError(error instanceof Error ? error.message : t('settings.goal.errors.load'));
			});
		return () => {
			mounted = false;
		};
	}, [t]);

	const saveGoalSettings = (patch: Partial<GoalSettings>): void => {
		setGoalError(null);
		window.agent
			.goalSaveSettings(patch)
			.then(setGoalSettings)
			.catch((error: unknown) => {
				setGoalError(error instanceof Error ? error.message : t('settings.goal.errors.save'));
			});
	};

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
				/>
			</SettingsSection>

			<SettingsSection
				title={t('settings.goal.title')}
				description={t('settings.goal.description')}
			>
				{goalError && (
					<SettingsNotice variant="destructive" icon={AlertTriangle}>
						{goalError}
					</SettingsNotice>
				)}
				{goalSettings ? (
					<SettingsPanel>
						<GoalBudgetRow
							id="goal-max-iterations"
							title={t('settings.goal.fields.maxIterations')}
							value={goalSettings.maxIterations}
							onCommit={(value) => saveGoalSettings({ maxIterations: value })}
						/>
						<GoalBudgetRow
							id="goal-max-tool-calls"
							title={t('settings.goal.fields.maxToolCalls')}
							value={goalSettings.maxToolCalls}
							onCommit={(value) => saveGoalSettings({ maxToolCalls: value })}
						/>
						<GoalBudgetRow
							id="goal-timeout-minutes"
							title={t('settings.goal.fields.timeoutMinutes')}
							value={Math.max(1, Math.round((goalSettings.timeoutMs ?? 600000) / 60000))}
							onCommit={(value) => saveGoalSettings({ timeoutMs: value * 60000 })}
						/>
					</SettingsPanel>
				) : (
					<SettingsLoadingRows rows={3} />
				)}
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
