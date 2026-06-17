import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { cn } from '@/lib/utils';
export const TitleBarContainer = memo(function AppTitleBarContainer({ className, style, children, }) {
    return (_jsx("div", { className: cn('app-translucent-surface fixed inset-x-0 top-0 z-50 flex h-12 shrink-0 items-center select-none border-b border-border/50 bg-background/70 backdrop-blur-xl', className), style: {
            WebkitAppRegion: 'drag',
            ...style,
        }, children: children }));
});
