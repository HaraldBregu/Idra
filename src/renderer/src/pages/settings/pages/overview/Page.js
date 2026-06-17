import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { AGENTS } from '@/lib/compat';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection, } from '../../components';
import { SETTINGS_NAVIGATION, SETTINGS_MODEL_SERVICE_ITEMS, } from '../../navigation';
const SETTINGS_OVERVIEW_GROUPS = [
    {
        id: 'app',
        titleKey: 'settings.overview.groups.app',
        paths: ['/settings/general', '/settings/system', '/settings/providers'],
    },
    {
        id: 'agent',
        agentIds: [AGENTS.assistant],
        paths: [],
    },
    {
        id: 'skills',
        paths: ['/settings/skills'],
    },
    {
        id: 'connectors',
        paths: ['/settings/connectors'],
    },
    {
        id: 'modelServices',
        titleKey: 'settings.overview.groups.modelServices',
        agentIds: [
            AGENTS.speechToText,
            AGENTS.textToSpeech,
            AGENTS.textToImage,
            AGENTS.textToVideo,
            AGENTS.textToAudio,
        ],
        paths: [],
    },
    {
        id: 'channels',
        titleKey: 'settings.overview.groups.channels',
        paths: ['/settings/channels'],
    },
];
function getSettingsNavigationItem(path) {
    return SETTINGS_NAVIGATION.find((item) => item.path === path);
}
const SETTINGS_OVERVIEW_AGENT_IDS = [
    AGENTS.assistant,
    AGENTS.speechToText,
    AGENTS.textToSpeech,
    AGENTS.textToImage,
    AGENTS.textToVideo,
    AGENTS.textToAudio,
];
const MODEL_SERVICE_ROUTE_IDS_BY_AGENT_ID = {
    [AGENTS.assistant]: AGENTS.assistant,
    [AGENTS.speechToText]: AGENTS.speechToText,
    [AGENTS.textToSpeech]: AGENTS.textToSpeech,
    [AGENTS.textToImage]: AGENTS.textToImage,
    [AGENTS.textToVideo]: AGENTS.textToVideo,
    [AGENTS.textToAudio]: AGENTS.textToAudio,
};
function getSettingsOverviewAgentItem(agentId) {
    const routeId = MODEL_SERVICE_ROUTE_IDS_BY_AGENT_ID[agentId];
    const path = `/settings/model-services/${routeId}/details`;
    const item = SETTINGS_MODEL_SERVICE_ITEMS.find((serviceItem) => serviceItem.path === path);
    if (!item)
        throw new Error(`Missing settings overview agent route: ${path}`);
    return { ...item, id: agentId };
}
function SettingsOverviewCard({ item, badge, disabled = false, }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const unavailable = disabled || ('comingSoon' in item && item.comingSoon === true);
    const handleActivate = () => {
        if (unavailable)
            return;
        navigate(item.path);
    };
    return (_jsxs(Item, { as: "button", type: "button", onClick: handleActivate, variant: "outline", size: "md", disabled: unavailable, className: "grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center border-b border-border/30 px-4 text-left last:border-b-0 disabled:cursor-default disabled:opacity-60", children: [_jsx(ItemIcon, { icon: item.icon, className: "size-7 [&_svg]:size-3.5" }), _jsxs(ItemContent, { className: "min-w-0 flex-1 flex-col items-start gap-0", children: [_jsx(ItemTitle, { className: "w-full max-w-full truncate leading-4 tracking-normal text-muted-foreground", children: t(item.labelKey) }), 'descriptionKey' in item && item.descriptionKey && (_jsx("p", { className: "mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground/50", children: t(item.descriptionKey) }))] }), _jsxs(ItemActions, { className: "ml-0 flex-none justify-end", children: [badge, unavailable ? (_jsx(Badge, { variant: "secondary", className: "text-[10px] leading-none", children: "Soon" })) : (_jsx(ChevronRight, { className: "size-3 shrink-0 text-muted-foreground/40", strokeWidth: 1.8 }))] })] }));
}
const OverviewPage = () => {
    const { t } = useTranslation();
    const disabledOverviewPaths = new Set(['/settings/skills']);
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: t('settings.title'), description: t('settings.description') }), SETTINGS_OVERVIEW_GROUPS.map((group) => {
                const panel = (_jsxs(SettingsPanel, { children: [group.agentIds?.map((agentId) => {
                            const item = getSettingsOverviewAgentItem(agentId);
                            return _jsx(SettingsOverviewCard, { item: item }, item.path);
                        }), group.paths.map((path) => {
                            const item = getSettingsNavigationItem(path);
                            return (_jsx(SettingsOverviewCard, { item: item, disabled: disabledOverviewPaths.has(item.path) }, item.path));
                        })] }));
                if (!group.titleKey) {
                    return (_jsx("section", { className: "flex flex-col gap-2", children: panel }, group.id));
                }
                return (_jsx(SettingsSection, { hideTitle: group.id === 'app', title: t(group.titleKey), children: panel }, group.id));
            })] }));
};
export default OverviewPage;
