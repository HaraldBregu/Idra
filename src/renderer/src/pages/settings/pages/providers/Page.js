import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, KeyRound, LoaderCircle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { openExternalUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';
import { DEFAULT_PROVIDERS } from '../../../../../../shared/providers';
import { actionableProviderCatalog, getErrorMessage, MASKED_API_KEY_LABEL, } from '../../../start/constants';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsSection, } from '../../components';
const ProvidersPage = () => {
    const { t } = useTranslation();
    const [providerEntries, setProviderEntries] = useState(() => actionableProviderCatalog.map((provider, index) => ({
        providerId: provider.id,
        apiKey: '',
        apiKeySaved: false,
        editing: index === 0,
    })));
    const [savingProviderId, setSavingProviderId] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        void Promise.all(actionableProviderCatalog.map(async (provider) => {
            const stored = await window.provider.get(provider.id);
            return [provider.id, (stored?.apiKey.trim().length ?? 0) > 0];
        }))
            .then((entries) => {
            if (cancelled)
                return;
            const savedStatus = Object.fromEntries(entries);
            const hasSavedProvider = Object.values(savedStatus).some(Boolean);
            setProviderEntries((currentEntries) => actionableProviderCatalog.map((provider, index) => {
                const current = currentEntries.find((entry) => entry.providerId === provider.id);
                const draft = current?.apiKey ?? '';
                const hasDraft = draft.trim().length > 0;
                const saved = savedStatus[provider.id] ?? false;
                return {
                    providerId: provider.id,
                    apiKey: draft,
                    apiKeySaved: saved,
                    editing: hasDraft
                        ? (current?.editing ?? false)
                        : saved
                            ? false
                            : (current?.editing ?? (!hasSavedProvider && index === 0)),
                };
            }));
        })
            .catch((err) => {
            if (cancelled)
                return;
            setError(getErrorMessage(err, 'Could not check saved provider access.'));
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const updateProviderEntry = (providerId, patch) => {
        setProviderEntries((currentEntries) => currentEntries.map((entry) => entry.providerId === providerId ? { ...entry, ...patch } : entry));
    };
    const handleProviderApiKeyChange = (providerId, apiKey) => {
        updateProviderEntry(providerId, { apiKey });
        setError(null);
    };
    const handleOpenProviderLink = (provider) => {
        if (!provider.apiConfigurationUrl)
            return;
        openExternalUrl(provider.apiConfigurationUrl);
    };
    const toStoredProvider = (providerId, apiKey) => {
        const provider = DEFAULT_PROVIDERS.find((item) => item.id === providerId);
        if (!provider)
            return undefined;
        return {
            name: provider.name,
            apiKey,
            baseUrl: provider.baseUrl,
        };
    };
    const saveProviderEntry = async (providerId) => {
        const entry = providerEntries.find((item) => item.providerId === providerId);
        const apiKey = entry?.apiKey.trim() ?? '';
        if (!entry || !apiKey)
            return;
        setSavingProviderId(providerId);
        setError(null);
        try {
            const provider = toStoredProvider(providerId, apiKey);
            if (!provider)
                throw new Error('Unknown provider.');
            await window.provider.set(providerId, provider);
            updateProviderEntry(providerId, { apiKey: '', apiKeySaved: true, editing: false });
        }
        catch (err) {
            setError(getErrorMessage(err, 'Could not save provider API key.'));
        }
        finally {
            setSavingProviderId(null);
        }
    };
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.tabs.providers'), description: t('settings.providers.description') }), error && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: error })), _jsx(SettingsSection, { title: t('settings.providers.registeredProviders'), children: _jsx("div", { className: "space-y-2", children: actionableProviderCatalog.map((provider) => {
                        const entry = providerEntries.find((item) => item.providerId === provider.id);
                        const connected = entry?.apiKeySaved ?? false;
                        const editing = entry?.editing ?? false;
                        const savingThisProvider = savingProviderId === provider.id;
                        const canSaveProvider = !!entry && !savingThisProvider && entry.apiKey.trim().length > 0;
                        return (_jsx(Card, { className: cn('rounded-lg border-border bg-card py-0 shadow-none', editing && 'border-ring ring-2 ring-ring/20', !provider.supported && 'opacity-70'), children: _jsxs(CardContent, { className: "p-0", children: [_jsxs("div", { className: cn('grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5', editing && 'pb-2'), children: [_jsx(ProviderAvatar, { providerId: provider.id, name: provider.name }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-1.5", children: [_jsx("h2", { className: "min-w-0 truncate text-sm font-semibold leading-tight text-foreground", children: provider.name }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", className: "size-5 text-muted-foreground hover:text-foreground", "aria-label": `Open ${provider.name} API setup`, onClick: () => handleOpenProviderLink(provider), children: _jsx(ExternalLink, { className: "size-3" }) })] }), _jsx("p", { className: "truncate text-xs font-medium leading-tight text-muted-foreground", children: connected ? MASKED_API_KEY_LABEL : provider.capabilities })] }), _jsx("div", { className: "flex shrink-0 justify-end gap-2", children: provider.supported ? (connected && !editing ? (_jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", "aria-label": `Edit ${provider.name} API key`, onClick: () => updateProviderEntry(provider.id, {
                                                        editing: true,
                                                        apiKey: '',
                                                    }), children: _jsx(Pencil, { className: "size-3.5" }) })) : editing ? null : (_jsx(Button, { type: "button", variant: "outline", size: "xs", onClick: () => updateProviderEntry(provider.id, { editing: true }), children: "Connect" }))) : (_jsx(Button, { type: "button", variant: "outline", size: "xs", disabled: true, children: "Soon" })) })] }), provider.supported && editing && entry ? (_jsxs("div", { className: "flex items-center gap-2 px-3 pb-3", children: [_jsx(Input, { "aria-label": `${provider.name} API key`, autoComplete: "off", className: "h-8 flex-1 rounded-md border-input bg-card px-2.5 text-xs font-semibold placeholder:text-muted-foreground", disabled: savingThisProvider, onChange: (event) => handleProviderApiKeyChange(provider.id, event.target.value), onKeyDown: (event) => {
                                                    if (event.key === 'Enter' && canSaveProvider) {
                                                        void saveProviderEntry(provider.id);
                                                    }
                                                }, placeholder: t('settings.providers.apiKeyPlaceholder'), spellCheck: false, type: "password", value: entry.apiKey }), _jsx(Button, { type: "button", variant: "outline", size: "sm", disabled: savingThisProvider, onClick: () => updateProviderEntry(provider.id, { apiKey: '', editing: false }), children: t('common.cancel') }), _jsxs(Button, { type: "button", size: "sm", disabled: !canSaveProvider, onClick: () => void saveProviderEntry(provider.id), children: [savingThisProvider ? (_jsx(LoaderCircle, { className: "size-3.5 animate-spin" })) : null, t('common.save')] })] })) : null] }) }, provider.id));
                    }) }) }), _jsx(SettingsNotice, { icon: KeyRound, children: "Keys stay in Friday's local app data folder and are only used for providers you connect. You can revoke them anytime." })] }));
};
export default ProvidersPage;
