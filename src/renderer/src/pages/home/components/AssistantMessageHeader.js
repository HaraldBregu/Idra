import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GradientSphere } from '@/components/ui/gradient-sphere';
import { cn } from '@/lib/utils';
export function AssistantMessageHeader({ avatarState = 'stopped', className, }) {
    return (_jsxs("div", { className: cn('flex min-w-0 items-center gap-2', className), children: [_jsx(GradientSphere, { size: 24, state: avatarState }), _jsx("span", { className: "min-w-0 truncate text-sm font-semibold leading-none text-foreground", children: "Friday" })] }));
}
