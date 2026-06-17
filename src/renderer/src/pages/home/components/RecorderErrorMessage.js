import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle } from 'lucide-react';
export function RecorderErrorMessage({ message, }) {
    if (!message)
        return null;
    return (_jsxs("div", { className: "mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive shadow-sm", children: [_jsx(AlertCircle, { className: "size-4 shrink-0" }), _jsx("p", { className: "min-w-0 truncate text-xs font-medium", children: message })] }));
}
