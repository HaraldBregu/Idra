import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { STEP_COPY } from '../constants';
export function PresentationStep() {
    const { title, description } = STEP_COPY.presentation;
    return (_jsxs("div", { className: "mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6", children: [_jsx(DomeWaveAnimation, { height: 120, className: "w-full max-w-sm" }), _jsx("h1", { className: "mt-8 text-3xl font-bold leading-tight tracking-tight text-foreground", children: title }), _jsx("p", { className: "mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground", children: description })] }));
}
