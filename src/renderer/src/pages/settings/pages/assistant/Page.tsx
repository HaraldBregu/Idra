import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Search, Trash2 } from 'lucide-react';
import { modelsFor, providers } from '@/lib/providers';
import { providerIdsFor, providerModels } from '@/lib/providers';
import { ModelOptions } from '@/components/model-options';
import { updateModelOptions } from '@/lib/options';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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
import { AgentMediaModelConfiguration } from './media';
import { SEARCH_ENGINES } from '../search/catalog';
import type { SearchEngineId, SearchSettings } from '../../../../../../shared/search_types';
import type { DataScope } from '../../../../../../shared/data_types';
import { Button } from '@/components/ui/button';

type CatalogProvider = PublicProvider;
type DataControlKind =
	| 'memory'
	| 'sessions'
	| 'wiki'
	| 'local_index'
	| 'local_namespace'
	| 'remote_namespace'
	| 'remote_all_namespaces';

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
		return provider && getProviderLlmModels(providerId).length > 0 ? [provider] : [];
	});
	const modelGroups: ProviderModelGroup[] = providers.map((provider) => ({
		provider,
		models: getProviderLlmModels(provider.id),
	}));
	const preferredGroup =
		modelGroups.find((group) => group.provider.id === storedProvider?.id) ?? modelGroups[0];
	const preferredModel =
		preferredGroup?.models.find((model) => model.id === storedModelId) ?? preferredGroup?.models[0];

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
	const [searchSettings, setSearchSettings] = useState<SearchSettings | null>(null);
	const [searchEngineError, setSearchEngineError] = useState<string | null>(null);
	const [searchSavingEngineId, setSearchSavingEngineId] = useState<SearchEngineId | null>(null);
	const [dataScopes, setDataScopes] = useState<DataScope[] | null>(null);
	const [dataAction, setDataAction] = useState<string | null>(null);
	const [dataError, setDataError] = useState<string | null>(null);
	const model = modelsFor('llm').find(
		(item) => item.provider.id === state.providerId && item.id === state.modelId
	);
	const inputs = model?.metadata?.documentationStatus === 'verified' ? model.metadata.inputs : {};
	const selectedSearchEngine = SEARCH_ENGINES.find(
		(engine) => engine.id === searchSettings?.engineId
	);
	const selectedSearchEngineDescription = selectedSearchEngine
		? t(selectedSearchEngine.descriptionKey)
		: t('settings.searchEngine.defaultDescription');

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
		let mounted = true;
		void window.dataControls.listScopes().then(
			(scopes) => {
				if (!mounted) return;
				setDataScopes(scopes);
				setDataError(null);
			},
			(error) => {
				if (mounted) setDataError(firstErrorMessage(error, t('settings.dataControls.loadError')));
			}
		);
		return () => {
			mounted = false;
		};
	}, [t]);

	useEffect(() => {
		void window.agent.getModelOptions().then(setModelOptions);
	}, []);
	useEffect(() => {
		let mounted = true;
		void window.search.getSettings().then(
			(next) => {
				if (!mounted) return;
				setSearchSettings(next);
				setSearchEngineError(null);
			},
			(error) => {
				if (!mounted) return;
				setSearchEngineError(firstErrorMessage(error, t('settings.searchEngine.errors.load')));
			}
		);
		return () => {
			mounted = false;
		};
	}, [t]);

	const saveModelOptions = (next: Record<string, unknown>): void => {
		setModelOptions(next);
		void window.agent.setModelOptions(next);
	};

	const updateModelOption = (path: readonly string[], value: unknown): void => {
		saveModelOptions(updateModelOptions(modelOptions, path, value));
	};

	const handleChange = async (nextProviderId: string, nextModelId: string): Promise<void> => {
		const group = state.modelGroups.find((item) => item.provider.id === nextProviderId);
		const model = group?.models.find((item) => item.id === nextModelId);
		if (!group || !model) return;
		setModelOptions({});
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

	const handleSearchEngineChange = (value: SearchEngineId | null): void => {
		if (!value) return;
		const engineId = value;
		setSearchSavingEngineId(engineId);
		setSearchEngineError(null);
		void window.search
			.selectEngine(engineId)
			.then(
				(next) => {
					setSearchSettings(next);
				},
				(error) => {
					setSearchEngineError(firstErrorMessage(error, t('settings.searchEngine.errors.select')));
				}
			)
			.finally(() => {
				setSearchSavingEngineId(null);
			});
	};

	const dataScope = (kind: DataControlKind): DataScope | undefined => {
		return dataScopes?.find((scope) => {
			if (kind === 'memory' || kind === 'sessions' || kind === 'wiki') {
				return scope.kind === kind;
			}
			return scope.kind === 'rag' && scope.mode === kind;
		});
	};

	const handleDataAction = async (
		kind: DataControlKind,
		action: 'export' | 'purge'
	): Promise<void> => {
		const scope = dataScope(kind);
		if (!scope) return;
		setDataAction(`${kind}:${action}`);
		setDataError(null);
		try {
			if (action === 'export') await window.dataControls.export(scope);
			else {
				const preview = await window.dataControls.previewPurge(scope);
				const purged = await window.dataControls.purge(scope, preview.confirmationId);
				if (purged) setDataScopes(await window.dataControls.listScopes());
			}
		} catch (error) {
			setDataError(firstErrorMessage(error, t('settings.dataControls.actionError')));
		} finally {
			setDataAction(null);
		}
	};

	const dataActions = (kind: DataControlKind, exportable = true) => (
		<>
			{exportable && (
				<Button
					variant="outline"
					size="sm"
					disabled={!dataScope(kind) || dataAction !== null}
					onClick={() => void handleDataAction(kind, 'export')}
				>
					<Download className="size-3" />
					{t('settings.dataControls.export')}
				</Button>
			)}
			<Button
				variant="destructive"
				size="sm"
				disabled={!dataScope(kind) || dataAction !== null}
				onClick={() => void handleDataAction(kind, 'purge')}
			>
				<Trash2 className="size-3" />
				{t('settings.dataControls.purge')}
			</Button>
		</>
	);
	const sessionDataScope = dataScope('sessions');
	const sessionCount =
		sessionDataScope?.kind === 'sessions' ? sessionDataScope.sessionIds.length : 0;

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
					<ModelOptions
						key={`${state.providerId}:${state.modelId}`}
						inputs={inputs}
						values={modelOptions}
						onChange={updateModelOption}
					/>
				</ModelProviderConfiguration>
				<AgentMediaModelConfiguration
					api={window.models.image}
					capability="text-to-image"
					idPrefix="agent-image"
					title={t('settings.modelServices.imageAssistantName')}
					description={t('settings.modelServices.imageModelDescription')}
				/>
				<AgentMediaModelConfiguration
					api={window.models.sound}
					capability="text-to-audio"
					idPrefix="agent-audio"
					title={t('settings.modelServices.musicCreatorName')}
					description={t('settings.modelServices.musicModelDescription')}
				/>
				<AgentMediaModelConfiguration
					api={window.models.video}
					capability="text-to-video"
					idPrefix="agent-video"
					title={t('settings.modelServices.videoCreatorName')}
					description={t('settings.modelServices.videoModelDescription')}
				/>
				<Collapsible className="min-w-0 max-w-full overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
					<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
							<Search className="size-4" aria-hidden="true" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="truncate text-[13px] font-medium leading-4 text-foreground">
								{t('settings.tabs.searchEngine')}
							</div>
							<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
								{selectedSearchEngine?.name ?? selectedSearchEngineDescription}
							</p>
						</div>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
					</CollapsibleTrigger>
					<CollapsibleContent className="border-t border-border/60">
						<div className="grid min-w-0 gap-3 px-3 py-3">
							{searchEngineError && (
								<SettingsNotice variant="destructive" icon={AlertTriangle}>
									{searchEngineError}
								</SettingsNotice>
							)}
							<Select
								value={searchSettings?.engineId ?? null}
								onValueChange={handleSearchEngineChange}
								disabled={!searchSettings || searchSavingEngineId !== null}
							>
								<SelectTrigger className="w-full text-xs [&_svg]:size-3">
									<SelectValue placeholder={t('settings.searchEngine.defaultTitle')} />
								</SelectTrigger>
								<SelectContent>
									{SEARCH_ENGINES.map((engine) => (
										<SelectItem
											key={engine.id}
											value={engine.id}
											disabled={!searchSettings?.configured[engine.id]}
										>
											{engine.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CollapsibleContent>
				</Collapsible>
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

			<SettingsSection title={t('settings.dataControls.title')}>
				{dataError && (
					<SettingsNotice variant="destructive" icon={AlertTriangle}>
						{dataError}
					</SettingsNotice>
				)}
				<SettingsPanel>
					<SettingsRow
						title={t('settings.dataControls.memory')}
						description={t('settings.dataControls.memoryDescription')}
						actions={dataActions('memory')}
					/>
					<SettingsRow
						title={t('settings.dataControls.sessions')}
						description={t('settings.dataControls.sessionsDescription', {
							count: sessionCount,
						})}
						actions={dataActions('sessions')}
					/>
					<SettingsRow
						title={t('settings.dataControls.ragIndex')}
						description={t('settings.dataControls.ragIndexDescription')}
						actions={dataActions('local_index')}
					/>
					<SettingsRow
						title={t('settings.dataControls.ragNamespace')}
						description={t('settings.dataControls.ragNamespaceDescription')}
						actions={dataActions('local_namespace')}
					/>
					<SettingsRow
						title={t('settings.dataControls.remoteNamespace')}
						description={t('settings.dataControls.remoteNamespaceDescription')}
						actions={dataActions('remote_namespace', false)}
					/>
					<SettingsRow
						title={t('settings.dataControls.remoteAllNamespaces')}
						description={t('settings.dataControls.remoteAllNamespacesDescription')}
						actions={dataActions('remote_all_namespaces', false)}
					/>
					<SettingsRow
						title={t('settings.dataControls.wiki')}
						description={t('settings.dataControls.wikiDescription')}
						actions={dataActions('wiki')}
					/>
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
