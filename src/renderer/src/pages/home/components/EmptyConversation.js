import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { GradientSphere } from '@/components/ui/gradient-sphere';
export function EmptyConversation() {
    return (_jsx(Empty, { className: "mx-auto max-w-sm border-0 p-0", children: _jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { className: "mt-8", children: _jsx(GradientSphere, { size: 72 }) }), _jsx(EmptyTitle, { children: "Start a conversation" }), _jsx(EmptyDescription, { children: "Ask Friday to inspect code, make a change, or help plan the next step." })] }) }));
}
