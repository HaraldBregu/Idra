'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStickToBottomContext } from '@/hooks/use-stick-to-bottom';
import { cn } from '@/lib/utils';
function ScrollButton({ className, variant = 'outline', size = 'sm', ...props }) {
    const { isAtBottom, scrollToBottom } = useStickToBottomContext();
    return (_jsx(Button, { variant: variant, size: size, className: cn('h-8 w-8 rounded-full transition-all duration-150 ease-out', isAtBottom
            ? 'pointer-events-none translate-y-2 opacity-0'
            : 'translate-y-0 opacity-100', className), onClick: () => scrollToBottom(), ...props, children: _jsx(ChevronDown, { className: "size-4" }) }));
}
export { ScrollButton };
