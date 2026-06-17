import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CircleOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import { ChannelIcon } from './ChannelIcon';
const RUNTIME_CHANNELS = new Set(['telegram']);
function getConnectionBadgeVariant(status) {
    if (status === 'connected')
        return 'secondary';
    if (status === 'error')
        return 'destructive';
    return 'outline';
}
const ChannelsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState([]);
    const [statusByChannel, setStatusByChannel] = useState({});
    const [loadError, setLoadError] = useState(null);
    useEffect(() => {
        let mounted = true;
        Promise.all([window.channels.listCatalog(), window.channels.getStatus()])
            .then(([nextCatalog, telegramStatus]) => {
            if (!mounted)
                return;
            setCatalog(nextCatalog);
            if (telegramStatus) {
                setStatusByChannel({ [telegramStatus.type]: telegramStatus.status });
            }
        })
            .catch((error) => {
            console.error('[ChannelsPage] Failed to load channel catalog:', error);
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
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.tabs.channels'), description: t('settings.channels.description') }), _jsx(SettingsSection, { title: t('settings.channels.catalog'), children: _jsx(Card, { size: "sm", className: "gap-0! p-0!", children: catalog.filter((entry) => entry.catalogVisible).map((entry, index, visibleCatalog) => {
                        const isRuntimeChannel = RUNTIME_CHANNELS.has(entry.id);
                        const status = statusByChannel[entry.id] ?? 'disconnected';
                        return (_jsx("button", { type: "button", onClick: () => navigate(`/settings/channels/channelDetail/${encodeURIComponent(entry.id)}`), className: "w-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", children: _jsxs(Item, { variant: "outline", size: "md", className: cn('cursor-pointer border-b border-border/60 hover:bg-muted/50', index === visibleCatalog.length - 1 && 'border-b-0'), children: [_jsx(ChannelIcon, { channelId: entry.id, name: entry.label, brandIconId: entry.brandIconId }), _jsx(ItemContent, { className: "min-w-0", children: _jsx(ItemTitle, { className: "w-full max-w-full truncate", children: entry.label }) }), _jsxs(ItemActions, { className: "ml-auto flex-none justify-end gap-1.5", children: [isRuntimeChannel ? (_jsx(Badge, { variant: getConnectionBadgeVariant(status), className: "h-5 px-2 text-[10px]", children: t(`channels.status.${status}`) })) : (_jsx(Badge, { variant: "outline", className: "h-5 px-2 text-[10px]", children: t('settings.channels.configOnly') })), !isRuntimeChannel && (_jsx(CircleOff, { className: "size-3.5 text-muted-foreground" })), _jsx(ChevronRight, { className: "size-3.5 text-muted-foreground", strokeWidth: 1.8 })] })] }) }, entry.id));
                    }) }) }), loadError && _jsx(SettingsNotice, { variant: "destructive", children: loadError })] }));
};
export default ChannelsPage;
