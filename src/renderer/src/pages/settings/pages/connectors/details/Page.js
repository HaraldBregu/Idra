import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Plug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SettingsEmptyState, SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsSection, } from '../../../components';
import { CONNECTOR_DEFAULTS } from '@shared/connector';
const APPROVAL_POLICIES = ['always', 'never'];
function formatTimestamp(value) {
    if (!value)
        return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return 'Never';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function formatApprovalPolicy(value) {
    return value ?? 'always';
}
function isApprovalPolicy(value) {
    return APPROVAL_POLICIES.includes(value);
}
function connectorRecordEntry(record, preferredId) {
    const entry = preferredId ? record[preferredId] : undefined;
    const id = preferredId && entry ? preferredId : (Object.entries(record)[0]?.[0]);
    const connector = id ? record[id] : undefined;
    if (!id || !connector)
        return undefined;
    const catalogEntry = CONNECTOR_DEFAULTS.find((e) => e.id === id);
    return { id, connector, catalogEntry };
}
function connectorName(id, catalogEntry) {
    return catalogEntry?.name ?? id;
}
const ConnectorDetailsPage = () => {
    const { t } = useTranslation();
    const { connectorId } = useParams();
    const [connectorRecord, setConnectorRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingApproval, setSavingApproval] = useState(false);
    const [savingEnabled, setSavingEnabled] = useState(false);
    useEffect(() => {
        let mounted = true;
        if (!connectorId) {
            setLoading(false);
            setError(t('settings.connectors.notFoundDescription'));
            return () => {
                mounted = false;
            };
        }
        setLoading(true);
        setError(null);
        void window.connectors.get(connectorId).then((nextConnector) => {
            if (!mounted)
                return;
            setConnectorRecord(nextConnector);
            setError(null);
            setLoading(false);
        }, (caught) => {
            if (!mounted)
                return;
            setConnectorRecord(null);
            setError(caught instanceof Error ? caught.message : String(caught));
            setLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, [connectorId, t]);
    if (loading) {
        return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.connectors.detailsTitle') }), _jsxs(Card, { size: "sm", className: "gap-0! p-3!", children: [_jsx(Skeleton, { className: "h-5 w-56 max-w-full" }), _jsx(Skeleton, { className: "mt-3 h-16 w-full" })] })] }));
    }
    const selected = connectorRecordEntry(connectorRecord ?? {}, connectorId);
    if (!selected) {
        return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.connectors.detailsTitle') }), _jsx(Card, { size: "sm", className: "gap-0! p-0!", children: _jsx(SettingsEmptyState, { icon: Plug, title: t('settings.connectors.notFoundTitle'), description: error ?? t('settings.connectors.notFoundDescription'), className: "min-h-28" }) })] }));
    }
    const { id, connector, catalogEntry } = selected;
    const httpConnector = connector.type === 'http' ? connector : undefined;
    const httpOrSse = connector.type === 'http' || connector.type === 'sse' ? connector : undefined;
    const authLabel = httpOrSse?.token ? 'Access token' : 'Remote MCP';
    const displayName = connectorName(id, catalogEntry);
    const approvalPolicy = formatApprovalPolicy(connector.require_approval);
    const enabled = connector.enabled !== false;
    const handleEnabledChange = async (checked) => {
        if (checked === enabled)
            return;
        const previousRecord = connectorRecord;
        const optimisticRecord = {
            ...(connectorRecord ?? {}),
            [id]: {
                ...connector,
                enabled: checked,
            },
        };
        setSavingEnabled(true);
        setError(null);
        setConnectorRecord(optimisticRecord);
        try {
            const nextRecord = await window.connectors.upsert({
                id,
                name: displayName,
                enabled: checked,
            });
            setConnectorRecord(nextRecord);
        }
        catch (caught) {
            setConnectorRecord(previousRecord);
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setSavingEnabled(false);
        }
    };
    const handleApprovalPolicyChange = async (value) => {
        if (!isApprovalPolicy(value) || value === approvalPolicy)
            return;
        const previousRecord = connectorRecord;
        const optimisticRecord = {
            ...(connectorRecord ?? {}),
            [id]: {
                ...connector,
                require_approval: value,
            },
        };
        setSavingApproval(true);
        setError(null);
        setConnectorRecord(optimisticRecord);
        try {
            const nextRecord = await window.connectors.upsert({
                id,
                name: displayName,
                requireApproval: value,
            });
            setConnectorRecord(nextRecord);
        }
        catch (caught) {
            setConnectorRecord(previousRecord);
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setSavingApproval(false);
        }
    };
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: displayName, description: catalogEntry?.description }), error && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: error })), _jsx(SettingsSection, { title: "Configuration", children: _jsxs(Card, { size: "sm", className: "gap-0! p-0!", children: [_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: "Connector" }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx("span", { className: "max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground", children: id }) })] }), httpOrSse && (_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: "Server URL" }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx("span", { className: "max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground", children: httpOrSse.url }) })] })), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: "Enabled" }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(Switch, { checked: enabled, disabled: savingEnabled, onCheckedChange: (checked) => void handleEnabledChange(checked), "aria-label": "Enabled" }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: "Require approval" }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsxs(Select, { value: approvalPolicy, onValueChange: (value) => {
                                            if (value)
                                                void handleApprovalPolicyChange(value);
                                        }, disabled: savingApproval, children: [_jsx(SelectTrigger, { className: "w-44 text-xs", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "always", children: "Always require approval" }), _jsx(SelectItem, { value: "never", children: "Never require approval" })] })] }) })] }), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: "Auth" }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx("span", { className: "max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground", children: authLabel }) })] }), httpConnector && (_jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: "Last refreshed" }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx("span", { className: "max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground", children: formatTimestamp(httpConnector.last_refreshed_at) }) })] })), _jsxs(Item, { variant: "outline", size: "md", className: "border-b border-border/60", children: [_jsx(ItemContent, { children: _jsx(ItemTitle, { children: "Updated" }) }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx("span", { className: "max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground", children: formatTimestamp(connector.updated_at) }) })] })] }) }), connector.last_error && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: connector.last_error }))] }));
};
export default ConnectorDetailsPage;
