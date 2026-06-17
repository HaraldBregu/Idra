import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { cn } from '@/lib/utils';
export const TitleBarLeftContainer = memo(function AppTitleBarLeftContainer({ isMac, isFullScreen = false, className, children, }) {
    return (_jsx("div", { className: cn('flex items-center h-full z-10 gap-1', isMac && (isFullScreen ? 'ml-2' : 'ml-20'), className), style: { WebkitAppRegion: 'no-drag' }, children: children }));
});
