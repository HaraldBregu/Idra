import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { cn } from '@/lib/utils';
import { AgentToolActivity } from './AgentToolActivity';
import { agentStatusLabel, isRunningState, stateTone } from './agent-status';
function statusLabelContent(message, isStreaming, statusLabel) {
    if (isStreaming && isRunningState(message.state)) {
        return _jsx(TextShimmer, { className: "text-sm", children: statusLabel });
    }
    return statusLabel;
}
export function AgentActivityPanel({ message, isStreaming, }) {
    const hasTools = message.tools.length > 0;
    const showActivity = hasTools ||
        (message.state !== 'idle' && message.state !== 'completed') ||
        Boolean(message.errorText);
    if (!showActivity)
        return null;
    const statusLabel = agentStatusLabel(message);
    const labelContent = statusLabelContent(message, isStreaming, statusLabel);
    const statusClassName = cn('inline-flex min-h-6 max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold', stateTone(message.state));
    return (_jsxs("div", { className: "flex w-full flex-col", children: [_jsx("div", { className: "flex w-full flex-col", children: hasTools ? (_jsx(AgentToolActivity, { tools: message.tools, className: "w-full" })) : (_jsx("span", { className: statusClassName, children: labelContent })) }), message.errorText && (_jsx("p", { className: "rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive", children: message.errorText }))] }));
}
