'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
function StepsItem({ children, className, ...props }) {
    return (_jsx("div", { className: cn('relative flex gap-3', className), ...props, children: children }));
}
function StepsTrigger({ children, className, leftIcon, swapIconOnHover = true, ...props }) {
    return (_jsxs(CollapsibleTrigger, { className: cn('group inline-flex w-fit items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground', className), ...props, children: [leftIcon ? (_jsxs("span", { className: "inline-grid size-4 place-items-center", children: [_jsx("span", { className: cn('text-muted-foreground', swapIconOnHover && 'group-hover:hidden'), children: leftIcon }), swapIconOnHover && (_jsx(ChevronDown, { className: "hidden size-3 -rotate-90 text-muted-foreground transition-transform group-data-[panel-open]:rotate-0 group-hover:block" }))] })) : (_jsx(ChevronDown, { className: "size-3 -rotate-90 text-muted-foreground transition-transform group-data-[panel-open]:rotate-0" })), _jsx("span", { children: children })] }));
}
function StepsContent({ children, className, bar, ...props }) {
    return (_jsx(CollapsibleContent, { className: cn('mt-2', className), ...props, children: _jsxs("div", { className: "relative pl-5", children: [bar ?? _jsx(StepsBar, {}), _jsx("div", { className: "flex flex-col gap-2", children: children })] }) }));
}
function StepsBar({ className, ...props }) {
    return (_jsx("span", { "aria-hidden": true, className: cn('absolute bottom-1 left-1.5 top-1 w-px bg-border', className), ...props }));
}
function Steps({ defaultOpen = true, className, ...props }) {
    return (_jsx(Collapsible, { defaultOpen: defaultOpen, className: cn('flex flex-col', className), ...props }));
}
export { Steps, StepsBar, StepsContent, StepsItem, StepsTrigger };
