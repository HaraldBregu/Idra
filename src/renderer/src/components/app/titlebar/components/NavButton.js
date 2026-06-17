import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function NavButton({ onClick, title, disabled = false, ghost = false, className, children }) {
    return (_jsx("button", { type: "button", onClick: onClick, disabled: disabled, title: title, className: cn('flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100', ghost ? 'hover:text-foreground' : 'hover:bg-accent/80 hover:text-foreground', disabled && 'cursor-not-allowed opacity-40 hover:text-muted-foreground', className), children: children }));
}
