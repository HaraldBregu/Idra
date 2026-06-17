'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { StickToBottom } from 'use-stick-to-bottom';
import { cn } from '@/lib/utils';
function ChatContainerRoot({ children, className, ...props }) {
    return (_jsx(StickToBottom, { className: cn('relative flex-1 overflow-y-auto', className), resize: "smooth", initial: "instant", role: "log", ...props, children: children }));
}
function ChatContainerContent({ children, className, ...props }) {
    return (_jsx(StickToBottom.Content, { className: cn('flex w-full flex-col', className), ...props, children: children }));
}
function ChatContainerScrollAnchor({ className, ref }) {
    return (_jsx("div", { ref: ref, className: cn('h-px w-full shrink-0 scroll-mt-4', className), "aria-hidden": "true" }));
}
export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };
