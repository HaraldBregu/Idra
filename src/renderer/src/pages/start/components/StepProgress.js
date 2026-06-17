import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { SETUP_STEPS, SETUP_STEP_TITLES } from '../constants';
export function StepProgress({ currentIndex }) {
    const currentStep = SETUP_STEPS[currentIndex];
    const currentStepName = currentStep ? SETUP_STEP_TITLES[currentStep] : 'Setup';
    return (_jsxs("div", { className: "grid gap-1.5", "aria-label": `Step ${currentIndex + 1} of ${SETUP_STEPS.length}`, children: [_jsx("div", { className: "flex items-center gap-1.5", children: SETUP_STEPS.map((setupStep, index) => (_jsx("span", { className: cn('h-1.5 rounded-full transition-all', index === currentIndex ? 'w-6 bg-primary' : 'w-1.5', index < currentIndex ? 'bg-primary' : 'bg-muted', index > currentIndex ? 'bg-muted' : undefined) }, setupStep))) }), _jsx("p", { className: "truncate text-[11px] text-muted-foreground", children: currentStepName })] }));
}
