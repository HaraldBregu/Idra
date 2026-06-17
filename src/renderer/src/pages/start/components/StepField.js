import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
export function StepField({ id, label, children, className }) {
    return (_jsxs("div", { className: cn('grid gap-1.5', className), children: [_jsx("div", { className: "grid gap-1", children: _jsx(Label, { htmlFor: id, className: "text-[11px] leading-4", children: label }) }), children] }));
}
