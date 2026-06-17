import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CircleOff, ExternalLink, Hash, KeyRound, Link2, Phone, Plus, RadioTower, Server, ShieldCheck, UserRound, X, } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsSection, } from '../../../components';
import { openExternalUrl } from '@/lib/external-links';
import { buildChannelDocsUrl, isChannelId, } from '../../../../../../../shared/channels';
import { ChannelIcon } from '../ChannelIcon';
const PHONE_CHANNELS = new Set([
    'imessage',
    'line',
    'qqbot',
    'signal',
    'telegram',
    'whatsapp',
    'zalo',
    'zalouser',
]);
const SERVER_CHANNELS = new Set([
    'discord',
    'feishu',
    'googlechat',
    'irc',
    'matrix',
    'mattermost',
    'msteams',
    'nextcloud-talk',
    'nostr',
    'slack',
    'synology-chat',
    'tlon',
    'twitch',
]);
const DM_POLICY_OPTIONS = ['allowlist', 'pairing', 'open', 'deny'];
function getConnectionBadgeVariant(status) {
    if (status === 'connected')
        return 'secondary';
    if (status === 'error')
        return 'destructive';
    return 'outline';
}
const ChannelDetailPage = () => {
    const { t } = useTranslation();
    const { channelId } = useParams();
    const selectedId = channelId && isChannelId(channelId) ? channelId : null;
    const [catalog, setCatalog] = useState([]);
    const [configs, setConfigs] = useState(null);
    const [listDrafts, setListDrafts] = useState({
        allowFrom: '',
        groupAllowFrom: '',
    });
    const [statusByChannel, setStatusByChannel] = useState({});
    const [busyChannel, setBusyChannel] = useState(null);
    const [loadError, setLoadError] = useState(null);
    useEffect(() => {
        let mounted = true;
        Promise.all([window.channels.listCatalog(), window.channels.getConfig(), window.channels.getStatus()])
            .then(([nextCatalog, nextConfig, telegramStatus]) => {
            if (!mounted)
                return;
            setCatalog(nextCatalog);
            setConfigs(nextConfig);
            if (telegramStatus) {
                setStatusByChannel({ [telegramStatus.type]: telegramStatus.status });
            }
        })
            .catch((error) => {
            console.error('[ChannelDetailPage] Failed to load channel settings:', error);
            if (mounted)
                setLoadError(error instanceof Error ? error.message : String(error));
        });
        const unsubscribe = window.channels.onStatusChanged((event) => {
            setStatusByChannel((current) => ({ ...current, [event.type]: event.status }));
            if (event.error)
                setLoadError(event.error);
        });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);
    useEffect(() => {
        setListDrafts({ allowFrom: '', groupAllowFrom: '' });
    }, [selectedId]);
    const selectedEntry = selectedId ? catalog.find((entry) => entry.id === selectedId) : null;
    const selectedConfig = selectedId ? configs?.[selectedId] ?? null : null;
    const selectedAccount = selectedConfig && selectedId
        ? getDefaultAccountConfig(selectedId, selectedConfig)
        : emptyAccountConfig(selectedId ?? 'telegram');
    const selectedStatus = selectedId ? statusByChannel[selectedId] ?? 'disconnected' : 'disconnected';
    const selectedTitle = selectedEntry?.label ?? t('settings.channels.configuration');
    const selectedDocsUrl = selectedEntry ? buildChannelDocsUrl(selectedEntry.docsPath, __APP_HOMEPAGE__) : null;
    const setSelectedConfig = (nextConfig) => {
        if (!selectedId)
            return;
        setConfigs((current) => {
            if (!current)
                return current;
            return { ...current, [selectedId]: nextConfig };
        });
    };
    const saveChannelConfig = async (channelId, config) => {
        setBusyChannel(channelId);
        setLoadError(null);
        try {
            const saved = await window.channels.saveChannelConfig(channelId, config);
            setConfigs((current) => {
                if (!current)
                    return current;
                return { ...current, [channelId]: saved };
            });
        }
        catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
        }
        finally {
            setBusyChannel(null);
        }
    };
    const saveSelectedConfig = async () => {
        if (!configs || !selectedId)
            return;
        await saveChannelConfig(selectedId, configs[selectedId]);
    };
    const updateSelectedConfig = (updater, options) => {
        if (!selectedConfig || !selectedId)
            return;
        const nextConfig = updater(selectedConfig);
        setSelectedConfig(nextConfig);
        if (options?.save)
            void saveChannelConfig(selectedId, nextConfig);
    };
    const updateAccountField = (field, value, options) => {
        if (!selectedId)
            return;
        updateSelectedConfig((config) => updateDefaultAccountConfig(selectedId, config, { [field]: value }), options);
    };
    const addListValue = (field) => {
        const value = listDrafts[field].trim();
        if (!value)
            return;
        const nextValues = normalizeList([...(selectedAccount[field] ?? []), value]);
        setListDrafts((current) => ({ ...current, [field]: '' }));
        updateAccountField(field, nextValues, { save: true });
    };
    const removeListValue = (field, value) => {
        updateAccountField(field, (selectedAccount[field] ?? []).filter((item) => item !== value), { save: true });
    };
    const handleRuntimeAction = async (action) => {
        if (selectedId !== 'telegram')
            return;
        setBusyChannel('telegram');
        setLoadError(null);
        try {
            await saveSelectedConfig();
            const status = action === 'start'
                ? await window.channels.startTelegram()
                : action === 'restart'
                    ? await window.channels.restartTelegram()
                    : (await window.channels.stopTelegram(), undefined);
            setStatusByChannel((current) => ({
                ...current,
                telegram: status?.status ?? (action === 'stop' ? 'disconnected' : current.telegram),
            }));
        }
        catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
        }
        finally {
            setBusyChannel(null);
        }
    };
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: selectedTitle, description: selectedEntry?.blurb, action: selectedDocsUrl && selectedEntry ? (_jsx(Button, { type: "button", variant: "outline", size: "icon-xs", "aria-label": selectedEntry.docsLabel, title: selectedEntry.docsLabel, onClick: () => openExternalUrl(selectedDocsUrl), children: _jsx(ExternalLink, { className: "size-3" }) })) : undefined, iconNode: selectedId ? (_jsx(ChannelIcon, { channelId: selectedId, name: selectedTitle, brandIconId: selectedEntry?.brandIconId, className: "size-full border-0 bg-transparent p-1", fallbackClassName: "size-3" })) : undefined }), loadError && _jsx(SettingsNotice, { variant: "destructive", children: loadError }), selectedEntry && selectedId !== 'telegram' && (_jsx(SettingsNotice, { icon: CircleOff, children: t('settings.channels.runtimeUnavailable') })), selectedId ? (_jsx(SettingsSection, { title: t('settings.channels.configuration'), action: _jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx(Badge, { variant: "outline", className: "h-5 px-2 text-[10px]", children: selectedId }), _jsx(Badge, { variant: isChannelEnabled(selectedId, selectedConfig) ? 'secondary' : 'outline', className: "h-5 px-2 text-[10px]", children: isChannelEnabled(selectedId, selectedConfig)
                                ? t('settings.channels.enabled')
                                : t('settings.channels.disabled') })] }), children: _jsxs(Card, { size: "sm", className: "gap-0! p-0!", children: [_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(ShieldCheck, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.enabled') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Switch, { checked: isChannelEnabled(selectedId, selectedConfig), onCheckedChange: (checked) => updateSelectedConfig((config) => updateChannelEnabled(selectedId, config, checked), {
                                            save: true,
                                        }), "aria-label": t('settings.channels.enabled') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(UserRound, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.accountLabel') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.label ?? '', onChange: (event) => updateAccountField('label', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.accountLabelPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.accountLabel') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(UserRound, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.username') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.username ?? '', onChange: (event) => updateAccountField('username', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.usernamePlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.username') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(UserRound, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.botUserId') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.botUserId ?? '', onChange: (event) => updateAccountField('botUserId', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.botUserIdPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.botUserId') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(KeyRound, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.token') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { type: "password", value: selectedAccount.token ?? '', onChange: (event) => updateAccountField('token', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: getTokenPlaceholder(selectedId, t), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.token') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(KeyRound, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.secret') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { type: "password", value: selectedAccount.secret ?? '', onChange: (event) => updateAccountField('secret', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.secretPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.secret') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Hash, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.appId') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.appId ?? '', onChange: (event) => updateAccountField('appId', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.appIdPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.appId') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Hash, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.clientId') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.clientId ?? '', onChange: (event) => updateAccountField('clientId', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.clientIdPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.clientId') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(KeyRound, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.clientSecret') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { type: "password", value: selectedAccount.clientSecret ?? '', onChange: (event) => updateAccountField('clientSecret', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.clientSecretPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.clientSecret') }) })] }), PHONE_CHANNELS.has(selectedId) && (_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Phone, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.phoneNumber') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { type: "tel", value: selectedAccount.phoneNumber ?? '', onChange: (event) => updateAccountField('phoneNumber', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.phoneNumberPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.phoneNumber') }) })] })), SERVER_CHANNELS.has(selectedId) && (_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Server, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.serverUrl') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.serverUrl ?? '', onChange: (event) => updateAccountField('serverUrl', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.serverUrlPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.serverUrl') }) })] })), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Link2, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.webhookUrl') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.webhookUrl ?? '', onChange: (event) => updateAccountField('webhookUrl', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.webhookUrlPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.webhookUrl') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Hash, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.defaultTarget') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Input, { value: selectedAccount.defaultTarget ?? '', onChange: (event) => updateAccountField('defaultTarget', event.target.value), onBlur: () => void saveSelectedConfig(), placeholder: t('settings.channels.defaultTargetPlaceholder'), className: "h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs", "aria-label": t('settings.channels.defaultTarget') }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(ShieldCheck, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.dmPolicy') }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsxs(Select, { value: selectedAccount.dmPolicy ?? 'allowlist', onValueChange: (value) => updateAccountField('dmPolicy', value, { save: true }), children: [_jsx(SelectTrigger, { size: "sm", className: "w-full sm:w-56", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: DM_POLICY_OPTIONS.map((policy) => (_jsx(SelectItem, { value: policy, children: t(`settings.channels.dmPolicies.${policy}`) }, policy))) })] }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60 flex-wrap", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(UserRound, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.allowFrom') }) }), _jsx(ItemActions, { className: "ml-auto w-full justify-end sm:w-[26rem] sm:flex-none", children: _jsx(ListEditor, { value: listDrafts.allowFrom, items: selectedAccount.allowFrom ?? [], placeholder: t('settings.channels.allowFromPlaceholder'), addLabel: t('settings.channels.addAllowFrom'), removeLabel: (item) => t('settings.channels.removeAllowFrom', { value: item }), emptyLabel: t('settings.channels.noAllowFrom'), onDraftChange: (value) => setListDrafts((current) => ({ ...current, allowFrom: value })), onAdd: () => addListValue('allowFrom'), onRemove: (value) => removeListValue('allowFrom', value) }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60 flex-wrap", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Hash, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.groupAllowFrom') }) }), _jsx(ItemActions, { className: "ml-auto w-full justify-end sm:w-[26rem] sm:flex-none", children: _jsx(ListEditor, { value: listDrafts.groupAllowFrom, items: selectedAccount.groupAllowFrom ?? [], placeholder: t('settings.channels.groupAllowFromPlaceholder'), addLabel: t('settings.channels.addGroupAllowFrom'), removeLabel: (item) => t('settings.channels.removeGroupAllowFrom', { value: item }), emptyLabel: t('settings.channels.noGroupAllowFrom'), onDraftChange: (value) => setListDrafts((current) => ({ ...current, groupAllowFrom: value })), onAdd: () => addListValue('groupAllowFrom'), onRemove: (value) => removeListValue('groupAllowFrom', value) }) })] }), _jsxs(Item, { variant: "outline", size: "md", children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(RadioTower, { className: "size-3", strokeWidth: 1.8 }) }), _jsx(ItemContent, { children: _jsx(ItemTitle, { children: t('settings.channels.status') }) }), _jsxs(ItemActions, { className: "ml-auto flex-none flex-wrap justify-end gap-2", children: [_jsx(Badge, { variant: getConnectionBadgeVariant(selectedStatus), className: "h-4 px-1.5 text-[10px] capitalize", children: selectedStatus.replaceAll('_', ' ') }), selectedId === 'telegram' ? (_jsxs(ButtonGroup, { children: [_jsx(Button, { type: "button", variant: "outline", size: "xs", disabled: busyChannel === 'telegram' || !selectedAccount.token?.trim(), onClick: () => void handleRuntimeAction('start'), children: t('settings.channels.pair') }), _jsx(Button, { type: "button", variant: "outline", size: "xs", disabled: busyChannel === 'telegram' || !selectedAccount.token?.trim(), onClick: () => void handleRuntimeAction('restart'), children: t('settings.channels.reconnect') }), _jsx(Button, { type: "button", variant: "outline", size: "xs", disabled: busyChannel === 'telegram', onClick: () => void handleRuntimeAction('stop'), children: t('common.close') })] })) : (_jsx(CircleOff, { className: "size-3.5 text-muted-foreground" }))] })] })] }) })) : (_jsx(SettingsNotice, { variant: "destructive", children: t('settings.channels.notConfigured') }))] }));
};
function ListEditor({ value, items, placeholder, addLabel, removeLabel, emptyLabel, onDraftChange, onAdd, onRemove, }) {
    return (_jsxs("div", { className: "flex w-full min-w-0 flex-col gap-1.5", children: [_jsxs(InputGroup, { className: "h-7", children: [_jsx(InputGroupInput, { value: value, onChange: (event) => onDraftChange(event.target.value), onKeyDown: (event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onAdd();
                            }
                        }, placeholder: placeholder, className: "h-7 min-w-0 px-2 text-xs md:text-xs", "aria-label": placeholder }), _jsx(InputGroupAddon, { align: "inline-end", className: "py-0 pr-1", children: _jsx(InputGroupButton, { type: "button", size: "icon-xs", onClick: onAdd, "aria-label": addLabel, title: addLabel, children: _jsx(Plus, { className: "size-3" }) }) })] }), _jsx("div", { className: "flex min-h-6 flex-wrap items-center gap-1.5", children: items.length > 0 ? (items.map((item) => (_jsxs(Badge, { variant: "outline", className: "h-4 max-w-full gap-1 px-1.5 pr-0.5 text-[10px]", children: [_jsx("span", { className: "max-w-48 truncate", children: item }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", onClick: () => onRemove(item), className: "size-4 rounded-sm p-0 text-muted-foreground hover:text-foreground", "aria-label": removeLabel(item), children: _jsx(X, { className: "size-2.5" }) })] }, item)))) : (_jsx("span", { className: "text-[11px] text-muted-foreground", children: emptyLabel })) })] }));
}
function getDefaultAccountConfig(channelId, config) {
    if (channelId === 'telegram') {
        const telegram = config;
        const account = telegram.accounts?.[telegram.defaultAccountId ?? 'default'];
        return {
            ...account,
            label: account?.label ?? 'Telegram bot',
            enabled: telegram.enabled ?? account?.enabled ?? false,
            token: account?.token ?? telegram.token,
            defaultTarget: account?.defaultTarget ?? telegram.defaultTarget,
            allowFrom: account?.allowFrom ?? telegram.allowFrom,
            groupAllowFrom: account?.groupAllowFrom ?? telegram.groupAllowFrom ?? [],
            dmPolicy: account?.dmPolicy ?? telegram.dmPolicy ?? 'allowlist',
        };
    }
    if (channelId === 'discord') {
        const discord = config;
        const account = discord.accounts?.[discord.defaultAccountId ?? 'default'];
        return {
            ...account,
            label: account?.label ?? 'Discord bot',
            enabled: discord.enabled ?? account?.enabled ?? false,
            token: account?.token ?? discord.token,
            defaultTarget: account?.defaultTarget ?? discord.defaultTarget,
            allowFrom: account?.allowFrom ?? discord.allowFrom,
            groupAllowFrom: account?.groupAllowFrom ?? discord.groupAllowFrom ?? [],
            dmPolicy: account?.dmPolicy ?? discord.dmPolicy ?? 'allowlist',
        };
    }
    if (channelId === 'whatsapp') {
        const whatsapp = config;
        const account = whatsapp.accounts?.[whatsapp.defaultAccountId ?? 'default'];
        return {
            ...account,
            label: account?.label ?? 'WhatsApp account',
            enabled: whatsapp.enabled ?? account?.enabled ?? false,
            token: account?.token ?? whatsapp.token,
            phoneNumber: account?.phoneNumber ?? whatsapp.phoneNumber,
            defaultTarget: account?.defaultTarget ?? whatsapp.defaultTarget,
            allowFrom: account?.allowFrom ?? whatsapp.allowFrom ?? [],
            groupAllowFrom: account?.groupAllowFrom ?? whatsapp.groupAllowFrom ?? [],
            dmPolicy: account?.dmPolicy ?? whatsapp.dmPolicy ?? 'allowlist',
        };
    }
    const generic = config;
    return generic.accounts?.[generic.defaultAccountId ?? 'default'] ?? emptyAccountConfig(channelId);
}
function updateDefaultAccountConfig(channelId, config, patch) {
    const current = getDefaultAccountConfig(channelId, config);
    const nextAccount = { ...current, ...patch };
    if (channelId === 'telegram') {
        const telegram = config;
        return {
            ...telegram,
            token: nextAccount.token ?? '',
            defaultTarget: nextAccount.defaultTarget,
            allowFrom: normalizeList(nextAccount.allowFrom ?? []),
            groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
            dmPolicy: nextAccount.dmPolicy,
            accounts: {
                ...(telegram.accounts ?? {}),
                default: nextAccount,
            },
        };
    }
    if (channelId === 'discord') {
        const discord = config;
        return {
            ...discord,
            token: nextAccount.token ?? '',
            defaultTarget: nextAccount.defaultTarget,
            allowFrom: normalizeList(nextAccount.allowFrom ?? []),
            groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
            dmPolicy: nextAccount.dmPolicy,
            accounts: {
                ...(discord.accounts ?? {}),
                default: nextAccount,
            },
        };
    }
    if (channelId === 'whatsapp') {
        const whatsapp = config;
        return {
            ...whatsapp,
            token: nextAccount.token ?? '',
            phoneNumber: nextAccount.phoneNumber ?? '',
            defaultTarget: nextAccount.defaultTarget,
            allowFrom: normalizeList(nextAccount.allowFrom ?? []),
            groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
            dmPolicy: nextAccount.dmPolicy,
            accounts: {
                ...(whatsapp.accounts ?? {}),
                default: nextAccount,
            },
        };
    }
    const generic = config;
    return {
        ...generic,
        defaultAccountId: generic.defaultAccountId ?? 'default',
        accounts: {
            ...(generic.accounts ?? {}),
            default: nextAccount,
        },
    };
}
function updateChannelEnabled(channelId, config, enabled) {
    const nextConfig = { ...config, enabled };
    return updateDefaultAccountConfig(channelId, nextConfig, { enabled });
}
function isChannelEnabled(channelId, config) {
    if (!config)
        return false;
    return Boolean(config.enabled ?? getDefaultAccountConfig(channelId, config).enabled);
}
function emptyAccountConfig(channelId) {
    return {
        label: `${channelId} default`,
        enabled: false,
        token: '',
        serverUrl: '',
        webhookUrl: '',
        defaultTarget: '',
        allowFrom: [],
        groupAllowFrom: [],
        dmPolicy: 'allowlist',
    };
}
function normalizeList(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
function getTokenPlaceholder(channelId, t) {
    if (channelId === 'telegram')
        return t('settings.channels.telegramTokenPlaceholder');
    if (channelId === 'discord')
        return t('settings.channels.discordTokenPlaceholder');
    return t('settings.channels.tokenPlaceholder');
}
export default ChannelDetailPage;
