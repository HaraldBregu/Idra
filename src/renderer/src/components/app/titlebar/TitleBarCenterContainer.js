import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { cn } from '@/lib/utils';
export const TitleBarCenterContainer = memo(function AppTitleBarCenterContainer({ className, children, }) {
    return (_jsx("div", { className: cn('absolute inset-0 flex items-center justify-center pointer-events-none bg-transparent', className), children: children }));
});
