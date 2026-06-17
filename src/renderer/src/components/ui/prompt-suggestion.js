'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
function escapeRegExp(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function highlightText(text, query) {
    if (!query)
        return text;
    const escaped = escapeRegExp(query);
    const re = new RegExp(`(${escaped})`, 'ig');
    const parts = text.split(re);
    return parts.map((part, i) => re.test(part) ? (_jsx("span", { className: "font-semibold text-foreground", children: part }, i)) : (_jsx("span", { className: "text-muted-foreground", children: part }, i)));
}
function PromptSuggestion({ children, variant, size, className, highlight, ...props }) {
    const isHighlightMode = typeof highlight === 'string';
    if (isHighlightMode && typeof children === 'string') {
        return (_jsx(Button, { variant: variant ?? 'ghost', size: size ?? 'sm', className: cn('w-full justify-start rounded-md text-left text-sm font-normal', className), ...props, children: highlightText(children, highlight ?? '') }));
    }
    return (_jsx(Button, { variant: variant ?? 'outline', size: size ?? 'lg', className: cn('rounded-full px-3 text-sm font-normal', className), ...props, children: children }));
}
export { PromptSuggestion };
