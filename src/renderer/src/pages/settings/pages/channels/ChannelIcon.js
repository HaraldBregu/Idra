import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getChannelBrandIconId } from '../../../../../../shared/channels';
const channelIconModules = import.meta.glob('@resources/icons/brands/*/*.png', {
    eager: true,
    import: 'default',
});
function buildIconAssets() {
    const partialAssets = {};
    for (const [path, url] of Object.entries(channelIconModules)) {
        const match = path.match(/brands\/[^/]+\/([^/]+)_(light|dark)(?:_NOT_A_LOGO)?\.png$/);
        if (!match)
            continue;
        const [, id, theme] = match;
        if (!id || (theme !== 'light' && theme !== 'dark'))
            continue;
        partialAssets[id] = { ...partialAssets[id], [theme]: url };
    }
    return Object.freeze(Object.fromEntries(Object.entries(partialAssets).filter((entry) => typeof entry[1].light === 'string' && typeof entry[1].dark === 'string')));
}
const CHANNEL_ICON_ASSETS = buildIconAssets();
export function ChannelIcon({ channelId, name, brandIconId, className, imageClassName, fallbackClassName, }) {
    const iconId = brandIconId ?? (channelId ? getChannelBrandIconId(channelId) : undefined);
    const asset = iconId ? CHANNEL_ICON_ASSETS[iconId] : undefined;
    return (_jsx("span", { className: cn('flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background p-1', className), "aria-hidden": "true", title: name, children: asset ? (_jsxs(_Fragment, { children: [_jsx("img", { src: asset.light, alt: "", draggable: false, className: cn('size-full object-contain dark:hidden', imageClassName) }), _jsx("img", { src: asset.dark, alt: "", draggable: false, className: cn('hidden size-full object-contain dark:block', imageClassName) })] })) : (_jsx(Bot, { className: cn('size-3.5 text-muted-foreground', fallbackClassName), strokeWidth: 1.8 })) }));
}
