import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { cn } from '@/lib/utils';
export const TitleBarRightContainer = memo(function AppTitleBarRightContainer({ className, children, }) {
    return (_jsx("div", { className: cn('flex items-center h-full z-10 gap-1', className), style: { WebkitAppRegion: 'no-drag' }, children: children }));
});
