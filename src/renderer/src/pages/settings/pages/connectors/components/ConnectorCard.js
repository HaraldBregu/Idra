import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronRight, PlugZap } from 'lucide-react';
import openaiIconDark from '@resources/icons/brands/openai/fallback_lobehub/png_dark/openai.png';
import openaiIconLight from '@resources/icons/brands/openai/fallback_lobehub/png_light/openai.png';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { ConnectorStatusBadge } from './ConnectorStatusBadge';
const directConnectorIconModules = import.meta.glob('@resources/icons/brands/*/*.png', { eager: true, import: 'default' });
const lobehubIconModules = import.meta.glob('@resources/icons/brands/*/fallback_lobehub/png_*/*.png', { eager: true, import: 'default' });
function buildIconAssets() {
    const partialAssets = {};
    for (const [path, url] of Object.entries(directConnectorIconModules)) {
        const match = path.match(/brands\/[^/]+\/([^/]+)_(light|dark)(?:_NOT_A_LOGO)?\.png$/);
        if (!match)
            continue;
        const [, id, theme] = match;
        if (!id || (theme !== 'light' && theme !== 'dark'))
            continue;
        partialAssets[id] = { ...partialAssets[id], [theme]: url };
    }
    for (const [path, url] of Object.entries(lobehubIconModules)) {
        const match = path.match(/brands\/([^/]+)\/fallback_lobehub\/png_(light|dark)\/\1\.png$/);
        if (!match)
            continue;
        const [, id, theme] = match;
        if (!id || (theme !== 'light' && theme !== 'dark'))
            continue;
        if (!partialAssets[id]?.[theme]) {
            partialAssets[id] = { ...partialAssets[id], [theme]: url };
        }
    }
    return Object.freeze(Object.fromEntries(Object.entries(partialAssets).filter((entry) => typeof entry[1].light === 'string' && typeof entry[1].dark === 'string')));
}
const CONNECTOR_ICON_ASSETS = buildIconAssets();
function isInteractiveTarget(target) {
    return target instanceof HTMLElement && Boolean(target.closest('button,a'));
}
function connectorStatus(connector) {
    if (connector.enabled === false)
        return 'disabled';
    if (connector.last_error)
        return 'error';
    return 'configured';
}
export function ConnectorCard({ catalogEntry, icon, connecting, connector, onConnect, onViewDetails, }) {
    const status = connector ? connectorStatus(connector.entry) : undefined;
    const connected = status === 'configured';
    const disabled = status === 'disabled';
    const hasDetails = typeof onViewDetails === 'function';
    const title = catalogEntry.name;
    const iconId = (catalogEntry.iconId ?? catalogEntry.id) || (connector?.id ?? catalogEntry.connectorId);
    const asset = icon ?? (iconId ? CONNECTOR_ICON_ASSETS[iconId] : undefined);
    const lightSrc = asset?.light ?? openaiIconLight;
    const darkSrc = asset?.dark ?? openaiIconDark;
    return (_jsxs(Item, { variant: "outline", size: "md", onClick: (event) => {
            if (isInteractiveTarget(event.target))
                return;
            if (hasDetails) {
                onViewDetails();
                return;
            }
            if (!connected && !disabled)
                onConnect();
        }, className: "cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95", children: [_jsxs(ItemMedia, { className: cn('size-8 shrink-0 overflow-hidden rounded-md border border-border/70 bg-background p-0'), children: [_jsx("img", { src: lightSrc, alt: "", draggable: false, className: "size-full object-contain dark:hidden" }), _jsx("img", { src: darkSrc, alt: "", draggable: false, className: "hidden size-full object-contain dark:block" })] }), _jsxs(ItemContent, { className: "min-w-0 flex-col items-start gap-1", children: [_jsxs("div", { className: "flex max-w-full items-center gap-2", children: [_jsx(ItemTitle, { className: "min-w-0 truncate", children: title }), status ? (_jsx(ConnectorStatusBadge, { status: status })) : (_jsx(Badge, { variant: "outline", className: "h-4 px-1.5 text-[10px]", children: "Not connected" }))] }), _jsx("div", { className: "line-clamp-1 max-w-full text-[12px] text-muted-foreground", children: catalogEntry.description })] }), _jsxs(ItemActions, { className: "ml-auto flex-none justify-end gap-1.5", children: [!connected && !disabled && (_jsxs(Button, { variant: "outline", size: "sm", disabled: connecting, onClick: (event) => {
                            event.stopPropagation();
                            onConnect();
                        }, "aria-label": `Connect ${title}`, children: [_jsx(PlugZap, { className: "size-3.5" }), connecting ? 'Connecting' : 'Connect'] })), hasDetails && (_jsx(Button, { variant: "ghost", size: "icon-xs", onClick: (event) => {
                            event.stopPropagation();
                            onViewDetails();
                        }, "aria-label": `View ${title} details`, children: _jsx(ChevronRight, { className: "size-3" }) }))] })] }));
}
