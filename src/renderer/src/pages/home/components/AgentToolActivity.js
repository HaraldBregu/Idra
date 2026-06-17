import { jsx as _jsx } from "react/jsx-runtime";
import { Tool } from '@/components/prompt-kit/tool';
import { cn } from '@/lib/utils';
export function AgentToolActivity({ tools, className, }) {
    if (tools.length === 0)
        return null;
    return (_jsx("div", { className: cn('w-full', className), children: _jsx("div", { className: "flex w-full flex-col gap-0", children: tools.map((tool) => (_jsx(Tool, { toolPart: tool, className: "mt-0 w-full max-w-2xl" }, tool.toolCallId))) }) }));
}
