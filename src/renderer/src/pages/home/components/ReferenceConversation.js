import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MessageContent } from '@/components/ui/message';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
const exampleActions = [
    {
        name: 'Inspect a file',
        detail: 'explain changes',
        prompt: 'inspect src/renderer/src/pages/home/Page.tsx and explain what to improve',
    },
    {
        name: 'Make an edit',
        detail: 'small patch',
        prompt: 'make a focused UI improvement in the current page',
    },
    {
        name: 'Plan next step',
        detail: 'clear checklist',
        prompt: 'look at the project and tell me the next best implementation step',
    },
];
export function ReferenceConversation({ onUseSuggestion, }) {
    return (_jsx("div", { className: "mx-auto flex w-full max-w-3xl flex-col gap-5 px-2 pb-4 pt-5", children: _jsxs("section", { className: "flex max-w-xl flex-col gap-3", "aria-label": "Agent suggestions", children: [_jsx(MessageContent, { className: "w-fit rounded-xl px-4 py-3 text-sm font-medium leading-snug", children: "A few useful starting points:" }), _jsx("div", { className: "flex flex-col gap-2", children: exampleActions.map((action) => (_jsxs(PromptSuggestion, { type: "button", variant: "outline", size: "lg", className: "grid h-auto min-h-10 w-full grid-cols-[1fr_auto] rounded-xl px-4 py-2.5 text-left", onClick: () => onUseSuggestion(action.prompt), children: [_jsx("span", { className: "min-w-0 truncate text-sm font-semibold", children: action.name }), _jsx("span", { className: "text-xs font-medium text-muted-foreground", children: action.detail })] }, action.name))) })] }) }));
}
