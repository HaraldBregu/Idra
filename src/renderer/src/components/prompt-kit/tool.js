'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function formatValue(value) {
    if (value === null)
        return 'null';
    if (value === undefined)
        return 'undefined';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'object')
        return JSON.stringify(value, null, 2);
    return String(value);
}
function ToolInput({ input }) {
    if (!isRecord(input) || Object.keys(input).length === 0)
        return null;
    return (_jsxs("div", { children: [_jsx("h4", { className: "mb-0.5 text-xs font-medium text-muted-foreground", children: "Input" }), _jsx("div", { className: "rounded bg-muted/30 px-1.5 py-1 font-mono text-xs text-muted-foreground", children: Object.entries(input).map(([key, value]) => (_jsxs("div", { className: "mb-0.5", children: [_jsxs("span", { className: "text-muted-foreground", children: [key, ":"] }), ' ', _jsx("span", { children: formatValue(value) })] }, key))) })] }));
}
function ToolOutput({ output }) {
    if (output === undefined)
        return null;
    return (_jsxs("div", { children: [_jsx("h4", { className: "mb-0.5 text-xs font-medium text-muted-foreground", children: "Output" }), _jsx("div", { className: "max-h-60 overflow-auto rounded bg-muted/30 px-1.5 py-1 font-mono text-xs text-muted-foreground", children: _jsx("pre", { className: "whitespace-pre-wrap", children: formatValue(output) }) })] }));
}
function Tool({ toolPart, defaultOpen = false, className }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const { state, toolCallId } = toolPart;
    const input = toolPart.input ?? (toolPart.inputText ? { raw: toolPart.inputText } : undefined);
    const output = toolPart.output ?? toolPart.outputText;
    return (_jsx("div", { className: cn('overflow-hidden rounded-md', className), children: _jsxs(Collapsible, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(CollapsibleTrigger, { render: _jsx(Button, { type: "button", variant: "ghost", className: "p-0! h-auto w-full justify-start rounded-md bg-transparent! py-1 font-normal text-muted-foreground hover:bg-transparent hover:text-muted-foreground", children: _jsxs("div", { className: "flex min-w-0 items-center gap-1.5", children: [_jsx("span", { className: "truncate font-mono text-sm font-medium capitalize", children: toolPart.type }), _jsx(ChevronDown, { className: cn('size-3.5', isOpen && 'rotate-180') })] }) }) }), _jsx(CollapsibleContent, { className: cn('overflow-hidden', 'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'), children: _jsxs("div", { className: "space-y-1.5 bg-background px-1.5 py-1", children: [_jsx(ToolInput, { input: input }), _jsx(ToolOutput, { output: output }), state === 'output-error' && toolPart.errorText && (_jsxs("div", { children: [_jsx("h4", { className: "mb-0.5 text-xs font-medium text-muted-foreground", children: "Error" }), _jsx("div", { className: "rounded bg-muted/30 px-1.5 py-1 text-xs text-muted-foreground", children: toolPart.errorText })] })), state === 'input-streaming' && (_jsx("div", { className: "text-xs text-muted-foreground", children: "Processing tool call..." })), toolCallId && (_jsx("div", { className: "text-[11px] text-muted-foreground", children: _jsxs("span", { className: "font-mono", children: ["Call ID: ", toolCallId] }) }))] }) })] }) }));
}
export { Tool };
