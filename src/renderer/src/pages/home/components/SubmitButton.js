import { jsx as _jsx } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptInputAction } from '@/components/ui/prompt-input';
export function SubmitButton({ isLoading, canSubmit, disabled, onAction, }) {
    if (!isLoading && !canSubmit)
        return null;
    const label = isLoading ? 'Stop generation' : 'Send message';
    const iconKey = isLoading ? 'stop' : 'send';
    const icon = isLoading ? (_jsx(Square, { className: "size-4 fill-current" })) : (_jsx(ArrowUp, { className: "size-4" }));
    return (_jsx(PromptInputAction, { tooltip: label, children: _jsx(Button, { type: "button", variant: "default", size: "icon", className: "size-9 overflow-hidden rounded-full bg-foreground text-background hover:bg-foreground/90", "aria-label": label, disabled: disabled, onClick: onAction, children: _jsx(AnimatePresence, { mode: "wait", initial: false, children: _jsx(motion.span, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] }, className: "flex items-center justify-center", children: icon }, iconKey) }) }) }));
}
