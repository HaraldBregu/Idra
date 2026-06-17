'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
function FeedbackBar({ className, title = 'Was this response helpful?', icon, onHelpful, onNotHelpful, onClose, }) {
    return (_jsxs("div", { className: cn('flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm', className), children: [_jsxs("div", { className: "flex items-center gap-2 text-foreground", children: [icon, _jsx("span", { children: title })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon-sm", onClick: onHelpful, "aria-label": "Helpful", children: _jsx(ThumbsUp, { className: "size-3.5" }) }), _jsx(Button, { variant: "ghost", size: "icon-sm", onClick: onNotHelpful, "aria-label": "Not helpful", children: _jsx(ThumbsDown, { className: "size-3.5" }) }), onClose && (_jsx(Button, { variant: "ghost", size: "icon-sm", onClick: onClose, "aria-label": "Dismiss", children: _jsx(X, { className: "size-3.5" }) }))] })] }));
}
export { FeedbackBar };
