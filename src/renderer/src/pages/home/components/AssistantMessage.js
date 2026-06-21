import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { Tool } from '@/components/prompt-kit/tool';
import { Button } from '@/components/ui/button';
import { Message } from '@/components/prompt-kit/message';
import { cn } from '@/lib/utils';
import { markdownComponents } from './markdown';
import { statusLabel, isRunningState, stateTone } from './status';
const LONG_MESSAGE_LENGTH = 600;
function statusLabelContent(message, isStreaming, label) {
    if (isStreaming && isRunningState(message.state)) {
        return _jsx(TextShimmer, { className: "text-sm", children: label });
    }
    return label;
}
export function AssistantMessage({ message, isStreaming = false, collapseLongContent = false, className, }) {
    const canToggleContent = collapseLongContent && message.content.trim().length > LONG_MESSAGE_LENGTH;
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const hasContent = message.content.length > 0;
    const hasTools = message.tools.length > 0;
    const showActivity = hasTools ||
        (message.state !== 'idle' && message.state !== 'completed') ||
        Boolean(message.errorText);
    const label = statusLabel(message);
    const labelContent = statusLabelContent(message, isStreaming, label);
    const statusClassName = cn('inline-flex min-h-6 max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold', stateTone(message.state));
    return (_jsxs(Message, { className: cn('flex w-full flex-col', className), children: [hasContent && !hasTools && (_jsxs(_Fragment, { children: [_jsx(Markdown, { components: markdownComponents, children: message.content }), canToggleContent ? (_jsx(Button, { type: "button", variant: "ghost", size: "xs", className: "self-start text-muted-foreground hover:text-foreground", "aria-expanded": isContentExpanded, onClick: () => setIsContentExpanded((expanded) => !expanded), children: isContentExpanded ? 'Less' : 'More' })) : null] })), showActivity && (_jsx("div", { className: "flex w-full flex-col", children: hasTools ? (_jsx("div", { className: "w-full", children: _jsx("div", { className: "flex w-full flex-col gap-4", children: message.tools.map((tool) => (_jsx(Tool, { toolPart: tool, className: "mt-0 w-full max-w-2xl" }, tool.toolCallId))) }) })) : (_jsx("span", { className: statusClassName, children: labelContent })) }))] }));
}
