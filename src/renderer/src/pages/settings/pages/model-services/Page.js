import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, LoaderCircle, Save, Trash2 } from 'lucide-react';
import { DEFAULT_PROVIDERS } from '../../../../../../shared/providers';
import { LLM_MODELS_BY_PROVIDER, LLM_PROVIDERS, } from '../../../../../../shared/providers/models/llm';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { AGENTS } from '@/lib/compat';
import { appApi } from '@/lib/compat';
import { MODEL_SERVICE_DEFINITIONS, getProviderCatalogItem, } from '../../../start/constants';
import { SettingsEmptyState, SettingsField, SettingsLoadingRows, SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsRow, SettingsSection, } from '../../components';
import { SETTINGS_MODEL_SERVICE_ITEMS } from '../../navigation';
const initialState = {
    providers: [],
    modelGroups: [],
    providerId: '',
    modelId: '',
    loading: true,
    loadingModels: false,
    saving: false,
    saved: false,
    error: null,
};
const HOME_AGENT_SESSION_ID = 'home';
function normalizeServiceId(serviceId) {
    if (serviceId === 'friday' || serviceId === 'main')
        return AGENTS.assistant;
    return serviceId ?? '';
}
function mergeModels(models, selectedModel) {
    const byId = new Map(models.map((model) => [model.id, model]));
    if (selectedModel && !byId.has(selectedModel.id))
        byId.set(selectedModel.id, selectedModel);
    return [...byId.values()];
}
function mergeProviders(providers, selectedProvider) {
    const byId = new Map(providers.map((provider) => [provider.id, provider]));
    if (selectedProvider && !byId.has(selectedProvider.id))
        byId.set(selectedProvider.id, selectedProvider);
    return [...byId.values()];
}
function firstErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim())
        return error.message;
    return fallback;
}
function toPublicProvider(provider) {
    return {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        ...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
        ...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
    };
}
function getCatalogProviderById(providerId) {
    return DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
}
function getLlmProvidersFromCatalog() {
    return LLM_PROVIDERS.flatMap((providerId) => {
        const provider = getCatalogProviderById(providerId);
        return provider ? [toPublicProvider(provider)] : [];
    });
}
function getProviderLlmModels(providerId) {
    return [...(LLM_MODELS_BY_PROVIDER[providerId] ?? [])];
}
async function loadAssistantState() {
    const [storedProvider, storedModelId] = await Promise.all([
        window.agent.getProvider(),
        window.agent.getModelId(),
    ]);
    const providers = getLlmProvidersFromCatalog().filter((provider) => getProviderLlmModels(provider.id).length > 0);
    const modelGroups = providers.map((provider) => ({
        provider,
        models: getProviderLlmModels(provider.id),
    }));
    const preferredGroup = modelGroups.find((group) => group.provider.id === storedProvider?.id) ?? modelGroups[0];
    const preferredModel = preferredGroup?.models.find((model) => model.id === storedModelId) ??
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
async function loadServiceProviders(service, selection) {
    if (service.id === AGENTS.speechToText) {
        return mergeProviders(await window.stt.listProviders(), selection?.provider);
    }
    return mergeProviders(await appApi.getProviders(), selection?.provider);
}
const ModelServicePage = () => {
    const { t } = useTranslation();
    const { serviceId: routeServiceId } = useParams();
    const serviceId = normalizeServiceId(routeServiceId);
    const service = MODEL_SERVICE_DEFINITIONS.find((definition) => definition.id === serviceId);
    const navigationItem = SETTINGS_MODEL_SERVICE_ITEMS.find((item) => item.id === serviceId);
    const [state, setState] = useState(initialState);
    const [historyDeleting, setHistoryDeleting] = useState(false);
    const selectedGroup = useMemo(() => state.modelGroups.find((group) => group.provider.id === state.providerId), [state.modelGroups, state.providerId]);
    const selectedProvider = selectedGroup?.provider;
    const selectedModel = selectedGroup?.models.find((model) => model.id === state.modelId);
    useEffect(() => {
        if (!service)
            return;
        const activeService = service;
        let mounted = true;
        async function loadService() {
            setState((current) => ({
                ...current,
                loading: true,
                loadingModels: true,
                saved: false,
                error: null,
            }));
            try {
                if (activeService.id === AGENTS.assistant) {
                    const nextState = await loadAssistantState();
                    if (!mounted)
                        return;
                    setState(nextState);
                    return;
                }
                const selection = await activeService.getSelection();
                const providers = await loadServiceProviders(activeService, selection);
                if (!mounted)
                    return;
                const modelGroups = [];
                let firstModelError;
                for (const provider of providers) {
                    try {
                        const models = await activeService.getModels(provider);
                        const nextModels = selection?.provider.id === provider.id
                            ? mergeModels(models, selection.model)
                            : models;
                        if (nextModels.length > 0)
                            modelGroups.push({ provider, models: nextModels });
                    }
                    catch (error) {
                        firstModelError ??= error;
                    }
                }
                if (!mounted)
                    return;
                const preferredGroup = modelGroups.find((group) => group.provider.id === selection?.provider.id) ??
                    modelGroups[0];
                const preferredModel = preferredGroup?.models.find((model) => model.id === selection?.model.id) ??
                    preferredGroup?.models[0];
                setState({
                    providers,
                    modelGroups,
                    providerId: preferredGroup?.provider.id ?? '',
                    modelId: preferredModel?.id ?? '',
                    loading: false,
                    loadingModels: false,
                    saving: false,
                    saved: false,
                    error: firstModelError
                        ? firstErrorMessage(firstModelError, t('settings.modelServices.modelsLoadError'))
                        : null,
                });
            }
            catch (error) {
                if (!mounted)
                    return;
                setState({
                    ...initialState,
                    loading: false,
                    loadingModels: false,
                    error: firstErrorMessage(error, t('settings.modelServices.loadError')),
                });
            }
        }
        void loadService();
        return () => {
            mounted = false;
        };
    }, [service, t]);
    const handleProviderChange = (nextProviderId) => {
        const providerId = nextProviderId ?? '';
        const group = state.modelGroups.find((item) => item.provider.id === providerId);
        setState((current) => ({
            ...current,
            providerId,
            modelId: group?.models[0]?.id ?? '',
            saved: false,
            error: null,
        }));
    };
    const handleModelChange = (nextModelId) => {
        setState((current) => ({
            ...current,
            modelId: nextModelId ?? '',
            saved: false,
            error: null,
        }));
    };
    const handleSave = async () => {
        if (!service || !selectedProvider || !selectedModel)
            return;
        setState((current) => ({ ...current, saving: true, saved: false, error: null }));
        try {
            const didSave = service.id === AGENTS.assistant
                ? (await window.agent.setProvider(selectedProvider)) &&
                    (await window.agent.setModelId(selectedModel.id))
                : await service.saveSelection(selectedProvider, selectedModel);
            if (!didSave)
                throw new Error(t('settings.modelServices.saveError'));
            setState((current) => ({ ...current, saving: false, saved: true }));
        }
        catch (error) {
            setState((current) => ({
                ...current,
                saving: false,
                error: firstErrorMessage(error, t('settings.modelServices.saveError')),
            }));
        }
    };
    const handleClearHistory = async () => {
        if (!service || service.id !== AGENTS.assistant)
            return;
        if (!window.confirm(t('settings.chatHistory.confirmDelete')))
            return;
        setHistoryDeleting(true);
        setState((current) => ({ ...current, error: null }));
        try {
            await window.agent.clearMessages(HOME_AGENT_SESSION_ID);
        }
        catch (error) {
            setState((current) => ({
                ...current,
                error: firstErrorMessage(error, t('settings.chatHistory.errors.delete')),
            }));
        }
        finally {
            setHistoryDeleting(false);
        }
    };
    if (!service || !navigationItem) {
        return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.modelServices.detailsTitle') }), _jsx(SettingsPanel, { children: _jsx(SettingsEmptyState, { icon: AlertTriangle, title: t('settings.modelServices.notFoundTitle'), description: t('settings.modelServices.notFoundDescription') }) })] }));
    }
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t(navigationItem.labelKey), description: t(navigationItem.descriptionKey) }), state.error && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: state.error })), _jsx(SettingsSection, { title: t('settings.modelServices.configuration'), children: _jsxs(Collapsible, { className: "rounded-lg border border-border/70 bg-card", children: [_jsxs(CollapsibleTrigger, { className: "group flex w-full items-center gap-3 px-3 py-2.5 text-left", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[13px] font-medium leading-4 text-foreground", children: selectedProvider
                                                ? getProviderCatalogItem(selectedProvider.id).name
                                                : t('settings.modelServices.providerPlaceholder') }), _jsx("p", { className: "mt-0.5 truncate text-[11px] leading-4 text-muted-foreground", children: selectedModel?.name ?? selectedModel?.id ?? t('settings.modelServices.modelUnavailable') })] }), _jsx(ChevronDown, { className: "size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" })] }), _jsx(CollapsibleContent, { className: "border-t border-border/60", children: state.loading ? (_jsx(SettingsLoadingRows, { rows: 2 })) : (_jsxs("div", { className: "grid gap-3 px-3 py-3", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(SettingsField, { id: "model-service-provider", label: t('settings.modelServices.provider'), description: t('settings.modelServices.providerDescription'), children: _jsxs(Select, { value: state.providerId, onValueChange: handleProviderChange, disabled: state.loading || state.saving || state.modelGroups.length === 0, children: [_jsx(SelectTrigger, { id: "model-service-provider", className: "w-full text-xs", children: _jsx(SelectValue, { placeholder: t('settings.modelServices.providerPlaceholder') }) }), _jsx(SelectContent, { children: state.modelGroups.map((group) => (_jsx(SelectItem, { value: group.provider.id, children: getProviderCatalogItem(group.provider.id).name }, group.provider.id))) })] }) }), _jsx(SettingsField, { id: "model-service-model", label: t('settings.modelServices.model'), description: t('settings.modelServices.modelDescription'), children: _jsxs(Select, { value: state.modelId, onValueChange: handleModelChange, disabled: state.loading ||
                                                        state.loadingModels ||
                                                        state.saving ||
                                                        !selectedProvider ||
                                                        !selectedGroup ||
                                                        selectedGroup.models.length === 0, children: [_jsx(SelectTrigger, { id: "model-service-model", className: "w-full text-xs", children: _jsx(SelectValue, { placeholder: state.loadingModels
                                                                    ? t('settings.modelServices.modelsLoading')
                                                                    : t('settings.modelServices.modelPlaceholder') }) }), _jsx(SelectContent, { children: selectedGroup?.models.map((model) => (_jsx(SelectItem, { value: model.id, children: model.name || model.id }, model.id))) })] }) })] }), state.providers.length === 0 && (_jsx("p", { className: "text-[11px] leading-4 text-muted-foreground", children: t('settings.providers.noProviders') })), state.providers.length > 0 && state.modelGroups.length === 0 && (_jsx("p", { className: "text-[11px] leading-4 text-muted-foreground", children: t('settings.modelServices.noModels') })), state.saved && (_jsx("p", { className: "text-[11px] leading-4 text-muted-foreground", children: t('settings.modelServices.saved') })), _jsx("div", { className: "flex justify-end", children: _jsxs(Button, { type: "button", size: "sm", disabled: state.saving || !selectedProvider || !selectedModel, onClick: () => void handleSave(), children: [state.saving ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : (_jsx(Save, { className: "size-3" })), state.saving ? t('settings.modelServices.saving') : t('common.save')] }) })] })) })] }) }), service.id === AGENTS.assistant && (_jsx(SettingsSection, { title: t('settings.modelServices.history'), children: _jsx(SettingsPanel, { children: _jsx(SettingsRow, { title: t('settings.modelServices.history'), description: t('settings.chatHistory.description'), className: "grid-cols-[minmax(0,1fr)_auto]", actionClassName: "w-auto justify-end", actions: _jsx(Button, { type: "button", variant: "destructive", size: "icon", className: "size-8", disabled: historyDeleting, "aria-label": t('settings.chatHistory.delete'), onClick: () => void handleClearHistory(), children: historyDeleting ? (_jsx(LoaderCircle, { className: "size-3 animate-spin" })) : (_jsx(Trash2, { className: "size-3" })) }) }) }) }))] }));
};
export default ModelServicePage;
