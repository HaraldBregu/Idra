import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { cn } from '@/lib/utils';
export const TitleBarCenterContainerTitle = memo(function AppTitleBarCenterContainerTitle({ className, children, }) {
    return _jsx("span", { className: cn('text-sm font-normal tracking-wide', className), children: children });
});
